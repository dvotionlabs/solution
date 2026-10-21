-- CGP monthly 4/8 session allowances. Months use Europe/London local dates.
-- A plan is explicitly configured by the coach; no client is silently assigned 4 or 8.
-- Pre-existing packs overlapping a month block automatic duplication.

create table if not exists public.cgp_monthly_plans (
 client_id uuid primary key references public.cgp_profiles(id) on delete cascade,
 sessions_per_month integer not null check(sessions_per_month in (4,8)),
 start_month date not null default date_trunc('month',(now() at time zone 'Europe/London'))::date
  check(start_month=date_trunc('month',start_month::timestamp)::date),
 updated_at timestamptz not null default now()
);
alter table public.cgp_monthly_plans enable row level security;
revoke all on public.cgp_monthly_plans from public,anon,authenticated;
grant select on public.cgp_monthly_plans to authenticated;
drop policy if exists cgp_monthly_plans_read on public.cgp_monthly_plans;
create policy cgp_monthly_plans_read on public.cgp_monthly_plans for select to authenticated
 using(client_id=(select cgp_private.portal_id()) or (select cgp_private.portal_admin()));

create or replace function cgp_private.provision_monthly_allowances(p_date date)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 month_first date:=date_trunc('month',p_date::timestamp)::date;
 month_last date:=(date_trunc('month',p_date::timestamp)+interval '1 month - 1 day')::date;
 p record;
 existing public.cgp_session_credits;
 source text;
 created_count integer:=0;
 adjusted_count integer:=0;
 existing_count integer:=0;
 blocked_count integer:=0;
begin
 perform pg_advisory_xact_lock(8742169);
 for p in
  select m.client_id,m.sessions_per_month
  from public.cgp_monthly_plans m
  join public.cgp_profiles c on c.id=m.client_id
  where c.role='athlete' and c.active and m.start_month<=month_first
  order by m.client_id
 loop
  source:='CGP_MONTHLY:'||p.client_id::text||':'||to_char(month_first,'YYYY-MM');
  select * into existing from public.cgp_session_credits where source_reference=source for update;
  if existing.id is not null then
   if existing.client_id<>p.client_id then raise exception 'Monthly allocation ownership mismatch';end if;
   if existing.quantity<>p.sessions_per_month then
    update public.cgp_session_credits
      set quantity=p.sessions_per_month,starts_on=month_first,expires_on=month_last,
       label=to_char(month_first,'FMMonth YYYY')||' · '||p.sessions_per_month||' sessions'
      where id=existing.id;
    adjusted_count:=adjusted_count+1;
   else existing_count:=existing_count+1;end if;
  elsif exists(
    select 1 from public.cgp_session_credits c
    where c.client_id=p.client_id and c.starts_on<=month_last
      and coalesce(c.expires_on,'9999-12-31'::date)>=month_first
  ) then
   -- Do not double-credit a client with an existing overlapping manual pack.
   blocked_count:=blocked_count+1;
  else
   insert into public.cgp_session_credits(client_id,label,quantity,starts_on,expires_on,source_reference)
    values(p.client_id,to_char(month_first,'FMMonth YYYY')||' · '||p.sessions_per_month||' sessions',
     p.sessions_per_month,month_first,month_last,source);
   created_count:=created_count+1;
  end if;
 end loop;
 return jsonb_build_object('created',created_count,'updated',adjusted_count,
  'existing',existing_count,'blocked',blocked_count,
  'month',to_char(month_first,'YYYY-MM'));
end;
$function$;
revoke all on function cgp_private.provision_monthly_allowances(date)
 from public,anon,authenticated;

create or replace function public.cgp_monthly_plan_set(p_client uuid,p_sessions integer)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 allocations jsonb;
 month_first date:=date_trunc('month',(now() at time zone 'Europe/London'))::date;
begin
 if auth.uid() is null or not (select cgp_private.portal_admin()) then
  raise exception 'Coach access required';
 end if;
 if p_client is null or not exists(
  select 1 from public.cgp_profiles p where p.id=p_client and p.role='athlete' and p.active
 ) then raise exception 'Choose an active athlete';end if;
 if p_sessions is null or p_sessions=0 then
  delete from public.cgp_monthly_plans where client_id=p_client;
  return jsonb_build_object('sessions_per_month',null,'message',
   'Automatic monthly renewals stopped. Previously allocated sessions remain unchanged.');
 end if;
 if p_sessions not in (4,8) then raise exception 'Choose 4 or 8 sessions per month';end if;
 insert into public.cgp_monthly_plans(client_id,sessions_per_month,start_month)
 values(p_client,p_sessions,month_first)
 on conflict(client_id) do update set sessions_per_month=excluded.sessions_per_month,updated_at=now();
 allocations:=cgp_private.provision_monthly_allowances((now() at time zone 'Europe/London')::date);
 return jsonb_build_object('sessions_per_month',p_sessions,'allocations',allocations);
end;
$function$;
revoke all on function public.cgp_monthly_plan_set(uuid,integer) from public,anon,authenticated;
grant execute on function public.cgp_monthly_plan_set(uuid,integer) to authenticated;

create or replace function public.cgp_monthly_ensure(p_key text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
begin
 if not cgp_private.calendar_authorized(p_key) then
  raise exception 'Invalid CGP scheduler credential';
 end if;
 return cgp_private.provision_monthly_allowances((now() at time zone 'Europe/London')::date);
end;
$function$;
revoke all on function public.cgp_monthly_ensure(text) from public,anon,authenticated;
grant execute on function public.cgp_monthly_ensure(text) to anon;
