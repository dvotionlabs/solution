create or replace function public.cgp_calendar_sync_apply(p_key text,p_events jsonb,p_window_start timestamptz,p_window_end timestamptz)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 calendar cgp_private.calendar_connection;
 ev jsonb; eid text; summary text; start_at timestamptz; end_at timestamptz;
 target uuid; current_link cgp_private.calendar_event_links; old_booking public.cgp_bookings;
 pack uuid; item_date date; seen text[]:=array[]::text[];
 created_count int:=0;updated_count int:=0;cancelled_count int:=0;skipped_count int:=0;
 link_record record;changed_rows integer;
begin
 if not cgp_private.calendar_authorized(p_key) then raise exception 'Invalid calendar sync credential'; end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>2500 then raise exception 'Invalid calendar events batch'; end if;
 if p_window_start<now()-interval '55 days' or p_window_start>now()+interval '2 days'
    or p_window_end<=p_window_start or p_window_end>now()+interval '120 days'
 then raise exception 'Invalid Google Calendar sync window'; end if;
 select * into calendar from cgp_private.calendar_connection where singleton=1 for update;
 if calendar.singleton is null then raise exception 'Google Calendar is not connected'; end if;
 -- Serialise with manual CGP booking edits, which already lock the diary.
 perform pg_advisory_xact_lock(8742169);
 for ev in select value from jsonb_array_elements(p_events)
 loop
  eid:=ev->>'id'; summary:=btrim(coalesce(ev->>'summary',''));
  if eid is null or length(eid) not between 1 and 512 or length(summary)>120
   or ev->>'start' is null or ev->>'end' is null
   or ev->>'status'<>'confirmed' then skipped_count:=skipped_count+1;continue;end if;
  begin
   start_at:=(ev->>'start')::timestamptz;
   end_at:=(ev->>'end')::timestamptz;
  exception when others then skipped_count:=skipped_count+1;continue;end;
  if start_at<p_window_start or start_at>=p_window_end or end_at<=start_at
     or end_at>start_at+interval '4 hours' then skipped_count:=skipped_count+1;continue;end if;
  seen:=array_append(seen,eid);
  select l.* into current_link from cgp_private.calendar_event_links l
   where l.account_email=calendar.account_email and l.event_id=eid;
  select a.client_id into target from public.cgp_calendar_aliases a
   join public.cgp_profiles p on p.id=a.client_id
   where lower(a.alias)=lower(summary) and p.role='athlete' and p.active
   limit 1;
  if target is null or (current_link.booking_id is not null and current_link.client_id<>target) then
   if current_link.booking_id is not null then
    update public.cgp_bookings set status='cancelled' where id=current_link.booking_id and status in ('scheduled','completed');
    get diagnostics changed_rows = row_count;
    cancelled_count:=cancelled_count+changed_rows;
    delete from cgp_private.calendar_event_links where account_email=calendar.account_email and event_id=eid;
    current_link:=null;
   end if;
   if target is null then skipped_count:=skipped_count+1;continue;end if;
  end if;
  -- Prefer the client's earliest valid pack with at least one reservable slot.
  item_date:=(start_at at time zone 'Europe/London')::date;pack:=null;
  select c.id into pack from public.cgp_session_credits c
   where c.client_id=target and c.starts_on<=item_date and (c.expires_on is null or c.expires_on>=item_date)
    and (select count(*) from public.cgp_bookings b
         where b.credit_id=c.id and b.status<>'cancelled'
           and b.id is distinct from current_link.booking_id)<c.quantity
   order by c.starts_on, c.created_at,c.id limit 1;
  begin
   if current_link.booking_id is not null then
    select * into old_booking from public.cgp_bookings where id=current_link.booking_id;
    if old_booking.id is not null and old_booking.status in ('scheduled','completed') then
     -- Preserve the assigned pack if it still covers the rescheduled local day.
     if old_booking.credit_id is not null and exists(
      select 1 from public.cgp_session_credits c where c.id=old_booking.credit_id
       and c.starts_on<=item_date and (c.expires_on is null or c.expires_on>=item_date)
     ) then pack:=old_booking.credit_id;end if;
     if old_booking.starts_at is distinct from start_at or old_booking.ends_at is distinct from end_at
        or old_booking.credit_id is distinct from pack
        or old_booking.status is distinct from (case when end_at>now() then 'scheduled' else 'completed' end) then
      update public.cgp_bookings set starts_at=start_at,ends_at=end_at,
       credit_id=pack,title='Coaching session',location='London',notes='',
       status=(case when end_at>now() then 'scheduled' else 'completed' end)
       where id=current_link.booking_id;
      updated_count:=updated_count+1;
     end if;
    end if;
    update cgp_private.calendar_event_links set touched_at=now()
     where account_email=calendar.account_email and event_id=eid;
   else
    -- Never duplicate a manually entered booking with the identical client and slot.
    select b.* into old_booking from public.cgp_bookings b
      where b.client_id=target and b.status in ('scheduled','completed')
        and b.starts_at=start_at and b.ends_at=end_at
        and not exists(select 1 from cgp_private.calendar_event_links l where l.booking_id=b.id)
      limit 1;
    if old_booking.id is null then
     insert into public.cgp_bookings(client_id,credit_id,title,starts_at,ends_at,location,notes,status)
      values(target,pack,'Coaching session',start_at,end_at,'London','','scheduled')
      returning * into old_booking;
     created_count:=created_count+1;
    elsif old_booking.credit_id is null and pack is not null then
     update public.cgp_bookings set credit_id=pack where id=old_booking.id;
     updated_count:=updated_count+1;
    end if;
    insert into cgp_private.calendar_event_links(account_email,event_id,booking_id,client_id)
     values(calendar.account_email,eid,old_booking.id,target);
   end if;
  exception when others then
   skipped_count:=skipped_count+1;
  end;
 end loop;
 -- A removed or renamed event cancels only FUTURE calendar-linked scheduled bookings.
 for link_record in select l.booking_id,l.event_id from cgp_private.calendar_event_links l
  join public.cgp_bookings b on b.id=l.booking_id
  where l.account_email=calendar.account_email
    and b.starts_at>=greatest(p_window_start,now()) and b.starts_at<p_window_end
    and not(l.event_id=any(seen))
 loop
  update public.cgp_bookings set status='cancelled' where id=link_record.booking_id and status='scheduled';
  get diagnostics changed_rows = row_count;
  delete from cgp_private.calendar_event_links where account_email=calendar.account_email and event_id=link_record.event_id;
  cancelled_count:=cancelled_count+changed_rows;
 end loop;
 update cgp_private.calendar_connection set last_sync_at=now(),last_error=null,updated_at=now() where singleton=1;
 return jsonb_build_object('created',created_count,'updated',updated_count,'cancelled',cancelled_count,
    'skipped',skipped_count,'processed',jsonb_array_length(p_events));
end;
$$;
revoke all on function public.cgp_calendar_sync_apply(text,jsonb,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.cgp_calendar_sync_apply(text,jsonb,timestamptz,timestamptz) to anon;


-- Reconcile completed appointments and deletions within the imported retrospective window.
-- Only calendar-linked entries are touched; manual CGP bookings are never auto-completed.
create or replace function public.cgp_calendar_sync_finalize(
 p_key text,p_events jsonb,p_window_start timestamptz,p_window_end timestamptz
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 c cgp_private.calendar_connection;
 item record;
 observed text[];
 pack_id uuid;
 local_day date;
 count_completed integer:=0;
 count_cancelled integer:=0;
 count_credited integer:=0;
 changed integer;
begin
 if not cgp_private.calendar_authorized(p_key) then raise exception 'Invalid calendar sync credential';end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>2500
  then raise exception 'Invalid calendar event batch';end if;
 if p_window_start<now()-interval '55 days' or p_window_start>now()+interval '2 days'
  or p_window_end<=p_window_start or p_window_end>now()+interval '120 days'
  then raise exception 'Invalid calendar sync window';end if;
 select * into c from cgp_private.calendar_connection where singleton=1 for update;
 if c.singleton is null then return jsonb_build_object('connected',false);end if;
 perform pg_advisory_xact_lock(8742169);
 select coalesce(array_agg(e.value->>'id'),'{}'::text[]) into observed
  from jsonb_array_elements(p_events) e(value)
  where jsonb_typeof(e.value->'id')='string';
 for item in
  select l.event_id,l.booking_id,b.client_id,b.credit_id,b.starts_at,b.ends_at,b.status
  from cgp_private.calendar_event_links l
  join public.cgp_bookings b on b.id=l.booking_id
  where l.account_email=c.account_email
   and b.starts_at>=p_window_start and b.starts_at<p_window_end
 loop
  if not (item.event_id=any(observed)) then
   -- If a previously imported event is removed after its slot has passed,
   -- undo even an automatically completed booking and restore its credit.
   if item.starts_at<now() then
    update public.cgp_bookings set status='cancelled'
      where id=item.booking_id and status in ('scheduled','completed');
    get diagnostics changed=row_count;
    count_cancelled:=count_cancelled+changed;
    delete from cgp_private.calendar_event_links
      where account_email=c.account_email and event_id=item.event_id;
   end if;
   continue;
  end if;
  if item.credit_id is null then
   local_day:=(item.starts_at at time zone 'Europe/London')::date;
   pack_id:=null;
   select cr.id into pack_id from public.cgp_session_credits cr
    where cr.client_id=item.client_id and cr.starts_on<=local_day
      and (cr.expires_on is null or cr.expires_on>=local_day)
      and (select count(*) from public.cgp_bookings b
        where b.credit_id=cr.id and b.status<>'cancelled')<cr.quantity
    order by cr.starts_on,cr.created_at,cr.id limit 1;
   if pack_id is not null then
    update public.cgp_bookings set credit_id=pack_id where id=item.booking_id;
    count_credited:=count_credited+1;
   end if;
  end if;
  if item.status='scheduled' and item.ends_at<=now() then
   update public.cgp_bookings set status='completed'
    where id=item.booking_id and status='scheduled';
   get diagnostics changed=row_count;
   count_completed:=count_completed+changed;
  end if;
 end loop;
 return jsonb_build_object('completed',count_completed,'cancelled',count_cancelled,
  'credits_assigned',count_credited);
end;
$function$;
revoke all on function public.cgp_calendar_sync_finalize(text,jsonb,timestamptz,timestamptz)
 from public,anon,authenticated;
grant execute on function public.cgp_calendar_sync_finalize(text,jsonb,timestamptz,timestamptz)
 to anon;
