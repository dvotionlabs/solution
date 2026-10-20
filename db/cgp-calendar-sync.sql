-- CGP Google Calendar -> athlete-booking mapping, read-only from Google.
-- Private calendar credentials and event IDs are never exposed to athlete APIs.

create table if not exists public.cgp_calendar_aliases (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.cgp_profiles(id) on delete cascade,
 alias text not null check(length(alias) between 2 and 80 and alias=btrim(alias)),
 created_at timestamptz not null default now()
);
create unique index if not exists cgp_calendar_alias_unique on public.cgp_calendar_aliases (lower(alias));
create index if not exists cgp_calendar_alias_client on public.cgp_calendar_aliases (client_id);
alter table public.cgp_calendar_aliases enable row level security;
revoke all on public.cgp_calendar_aliases from public,anon,authenticated;
grant select,insert,delete on public.cgp_calendar_aliases to authenticated;
drop policy if exists cgp_calendar_alias_admin_read on public.cgp_calendar_aliases;
create policy cgp_calendar_alias_admin_read on public.cgp_calendar_aliases
 for select to authenticated using ((select cgp_private.portal_admin()));
drop policy if exists cgp_calendar_alias_admin_insert on public.cgp_calendar_aliases;
create policy cgp_calendar_alias_admin_insert on public.cgp_calendar_aliases
 for insert to authenticated with check ((select cgp_private.portal_admin()) and exists (
  select 1 from public.cgp_profiles p where p.id=client_id and p.role='athlete' and p.active
 ));
drop policy if exists cgp_calendar_alias_admin_delete on public.cgp_calendar_aliases;
create policy cgp_calendar_alias_admin_delete on public.cgp_calendar_aliases
 for delete to authenticated using ((select cgp_private.portal_admin()));

create table if not exists cgp_private.calendar_connection (
 singleton smallint primary key default 1 check(singleton=1),
 calendar_id text not null default 'primary' check(calendar_id='primary'),
 account_email text not null check(length(account_email) between 5 and 254),
 encrypted_tokens text not null check(length(encrypted_tokens) between 30 and 8192),
 connected_at timestamptz not null default now(),
 last_sync_at timestamptz,
 last_error text,
 updated_at timestamptz not null default now()
);
create table if not exists cgp_private.calendar_sync_credentials (
 name text primary key check(name='cron'),
 key_hash text not null check(length(key_hash)=64)
);
create table if not exists cgp_private.calendar_event_links (
 account_email text not null,
 event_id text not null check(length(event_id) between 1 and 512),
 booking_id uuid not null unique references public.cgp_bookings(id) on delete cascade,
 client_id uuid not null references public.cgp_profiles(id),
 touched_at timestamptz not null default now(),
 primary key (account_email,event_id)
);
create index if not exists cgp_calendar_links_client on cgp_private.calendar_event_links(client_id);
revoke all on cgp_private.calendar_connection,cgp_private.calendar_sync_credentials,cgp_private.calendar_event_links from public,anon,authenticated;

-- Only a server with a separate 256-bit secret may run automated sync.
insert into cgp_private.calendar_sync_credentials(name,key_hash)
values('cron','4fc33e45210d6a8c88c4c7a6438e65fb7b221d8979cffe6dcf50b0e33ed2533a')
on conflict(name) do update set key_hash=excluded.key_hash;

-- The user explicitly uses Akash / Aakash for this particular existing CGP athlete.
insert into public.cgp_calendar_aliases(client_id,alias)
select id,a.alias from public.cgp_profiles
cross join (values('Akash'),('Aakash')) as a(alias)
where lower(name)='aakash kabra' and role='athlete'
on conflict do nothing;

create or replace function cgp_private.calendar_authorized(p_key text)
returns boolean language sql stable security definer set search_path=''
as $$
 select p_key is not null and length(p_key)>30 and exists (
  select 1 from cgp_private.calendar_sync_credentials
  where name='cron' and key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex')
 );
$$;
revoke all on function cgp_private.calendar_authorized(text) from public,anon,authenticated;

create or replace function public.cgp_calendar_admin_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare c cgp_private.calendar_connection;
begin
 if auth.uid() is null or not cgp_private.portal_admin() then raise exception 'Admin access required'; end if;
 select * into c from cgp_private.calendar_connection where singleton=1;
 return jsonb_build_object('connected',c.singleton is not null,'email',c.account_email,
    'last_sync_at',c.last_sync_at,'last_error',c.last_error);
end;
$$;
revoke all on function public.cgp_calendar_admin_status() from public,anon,authenticated;
grant execute on function public.cgp_calendar_admin_status() to authenticated;

create or replace function public.cgp_calendar_admin_connect(p_tokens text,p_email text)
returns void language plpgsql security definer set search_path=''
as $$
declare c cgp_private.calendar_connection;
begin
 if auth.uid() is null or not cgp_private.portal_admin() then raise exception 'Admin access required'; end if;
 if length(p_tokens) not between 30 and 8192 or length(p_email) not between 5 and 254 or position('@' in p_email)=0 then raise exception 'Invalid Google authorisation'; end if;
 select * into c from cgp_private.calendar_connection where singleton=1;
 if c.singleton is not null and c.account_email<>lower(p_email) then
  raise exception 'Disconnect the previous Google Calendar before connecting another account';
 end if;
 insert into cgp_private.calendar_connection(singleton,calendar_id,account_email,encrypted_tokens,updated_at,last_error)
 values(1,'primary',lower(p_email),p_tokens,now(),null)
 on conflict(singleton) do update set encrypted_tokens=excluded.encrypted_tokens,updated_at=now(),last_error=null;
end;
$$;
revoke all on function public.cgp_calendar_admin_connect(text,text) from public,anon,authenticated;
grant execute on function public.cgp_calendar_admin_connect(text,text) to authenticated;

create or replace function public.cgp_calendar_admin_disconnect()
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not cgp_private.portal_admin() then raise exception 'Admin access required'; end if;
 delete from cgp_private.calendar_connection where singleton=1;
 -- Already mirrored bookings are retained; Google updates stop on disconnect.
end;
$$;
revoke all on function public.cgp_calendar_admin_disconnect() from public,anon,authenticated;
grant execute on function public.cgp_calendar_admin_disconnect() to authenticated;

create or replace function public.cgp_calendar_sync_state(p_key text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare c cgp_private.calendar_connection;
begin
 if not cgp_private.calendar_authorized(p_key) then raise exception 'Invalid calendar sync credential'; end if;
 select * into c from cgp_private.calendar_connection where singleton=1;
 if c.singleton is null then return jsonb_build_object('connected',false); end if;
 return jsonb_build_object('connected',true,'encrypted_tokens',c.encrypted_tokens,
  'account_email',c.account_email,'calendar_id',c.calendar_id,'last_sync_at',c.last_sync_at);
end;
$$;
revoke all on function public.cgp_calendar_sync_state(text) from public,anon,authenticated;
grant execute on function public.cgp_calendar_sync_state(text) to anon;

create or replace function public.cgp_calendar_sync_tokens(p_key text,p_encrypted_tokens text,p_error text default null)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not cgp_private.calendar_authorized(p_key) then raise exception 'Invalid calendar sync credential'; end if;
 if p_encrypted_tokens is not null and length(p_encrypted_tokens) not between 30 and 8192 then raise exception 'Invalid token payload'; end if;
 update cgp_private.calendar_connection set encrypted_tokens=coalesce(p_encrypted_tokens,encrypted_tokens),
   last_error=left(p_error,220),updated_at=now() where singleton=1;
end;
$$;
revoke all on function public.cgp_calendar_sync_tokens(text,text,text) from public,anon,authenticated;
grant execute on function public.cgp_calendar_sync_tokens(text,text,text) to anon;

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
 if p_window_start<now()-interval '3 days' or p_window_start>now()+interval '2 days'
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
    update public.cgp_bookings set status='cancelled' where id=current_link.booking_id and status='scheduled';
    get diagnostics changed_rows = row_count;
    cancelled_count:=cancelled_count+changed_rows;
    delete from cgp_private.calendar_event_links where account_email=calendar.account_email and event_id=eid;
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
    if old_booking.id is not null and old_booking.status='scheduled' then
     -- Preserve the assigned pack if it still covers the rescheduled local day.
     if old_booking.credit_id is not null and exists(
      select 1 from public.cgp_session_credits c where c.id=old_booking.credit_id
       and c.starts_on<=item_date and (c.expires_on is null or c.expires_on>=item_date)
     ) then pack:=old_booking.credit_id;end if;
     if old_booking.starts_at is distinct from start_at or old_booking.ends_at is distinct from end_at
        or old_booking.credit_id is distinct from pack then
      update public.cgp_bookings set starts_at=start_at,ends_at=end_at,
       credit_id=pack,title='Coaching session',location='London',notes=''
       where id=current_link.booking_id;
      updated_count:=updated_count+1;
     end if;
    end if;
    update cgp_private.calendar_event_links set touched_at=now()
     where account_email=calendar.account_email and event_id=eid;
   else
    -- Never duplicate a manually entered booking with the identical client and slot.
    select b.* into old_booking from public.cgp_bookings b
      where b.client_id=target and b.status='scheduled'
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
