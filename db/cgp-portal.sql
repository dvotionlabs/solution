-- CGP athlete portal. Additive to the existing enquiry/payment schema.
create table public.cgp_profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id),
 email text not null unique check(email=lower(trim(email))), name text not null check(length(name) between 2 and 100),
 role text not null default 'athlete' check(role in ('athlete','admin')), active boolean not null default true,
 created_at timestamptz not null default now()
);
create or replace function cgp_private.portal_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.cgp_profiles where user_id=auth.uid() and role='admin' and active);
$$;
create or replace function cgp_private.portal_id() returns uuid language sql stable security definer set search_path='' as $$
 select id from public.cgp_profiles where user_id=auth.uid() and active;
$$;
revoke all on function cgp_private.portal_admin(),cgp_private.portal_id() from public,anon,authenticated;
grant usage on schema cgp_private to authenticated;
grant execute on function cgp_private.portal_admin(),cgp_private.portal_id() to authenticated;

create table public.cgp_session_credits (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.cgp_profiles(id),
 label text not null check(length(label) between 2 and 120), quantity integer not null check(quantity between 1 and 500),
 starts_on date not null default current_date, expires_on date, source_reference text unique,
 created_at timestamptz not null default now(), check(expires_on is null or expires_on>=starts_on)
);
create table public.cgp_bookings (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.cgp_profiles(id),
 credit_id uuid references public.cgp_session_credits(id), title text not null default 'Coaching session' check(length(title) between 2 and 120),
 starts_at timestamptz not null, ends_at timestamptz not null,
 location text not null default 'London' check(length(location) between 1 and 200),
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled','no_show')),
 notes text not null default '' check(length(notes)<=2000), created_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours')
);
create index cgp_bookings_client_start on public.cgp_bookings(client_id,starts_at);
create index cgp_bookings_credit on public.cgp_bookings(credit_id);
create index cgp_credits_client on public.cgp_session_credits(client_id);
create function cgp_private.lock_diary() returns trigger language plpgsql set search_path='' as $$
 begin perform pg_advisory_xact_lock(8742169); return null; end;
$$;
create trigger cgp_diary_lock before insert or update on public.cgp_bookings for each statement execute function cgp_private.lock_diary();
create trigger cgp_credit_lock before insert or update on public.cgp_session_credits for each statement execute function cgp_private.lock_diary();
create function cgp_private.guard_booking() returns trigger language plpgsql set search_path='' as $$
 declare pack public.cgp_session_credits; used integer;
 begin
 -- The statement trigger serialises diary/pack writes before row locks are taken.
 if new.credit_id is not null then
  select * into pack from public.cgp_session_credits where id=new.credit_id for update;
  if pack.id is null or pack.client_id<>new.client_id then raise exception 'Choose a session pack belonging to this client'; end if;
  if new.status<>'cancelled' then
   if (new.starts_at at time zone 'Europe/London')::date<pack.starts_on or (pack.expires_on is not null and (new.starts_at at time zone 'Europe/London')::date>pack.expires_on) then raise exception 'This booking falls outside the session pack dates'; end if;
   select count(*) into used from public.cgp_bookings where credit_id=pack.id and id<>new.id and status<>'cancelled';
   if used>=pack.quantity then raise exception 'No unbooked sessions remain in this pack'; end if;
  end if;
 end if;
 if new.status='scheduled' and exists(select 1 from public.cgp_bookings where id<>new.id and status='scheduled' and starts_at<new.ends_at and ends_at>new.starts_at) then raise exception 'This time overlaps another booked session'; end if;
 return new;
 end;
$$;
create trigger cgp_booking_guard before insert or update on public.cgp_bookings for each row execute function cgp_private.guard_booking();
create function cgp_private.guard_credit() returns trigger language plpgsql set search_path='' as $$
 begin
 if new.client_id<>old.client_id then raise exception 'A session pack cannot be transferred'; end if;
 if new.quantity<(select count(*) from public.cgp_bookings where credit_id=new.id and status<>'cancelled') then raise exception 'The pack contains more bookings than this total'; end if;
 if exists(select 1 from public.cgp_bookings where credit_id=new.id and status<>'cancelled' and ((starts_at at time zone 'Europe/London')::date<new.starts_on or (new.expires_on is not null and (starts_at at time zone 'Europe/London')::date>new.expires_on))) then raise exception 'Existing bookings fall outside these pack dates'; end if;
 return new;
 end;
$$;
create trigger cgp_credit_guard before update on public.cgp_session_credits for each row execute function cgp_private.guard_credit();

create table public.cgp_exercises (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 2 and 120),
 category text not null default 'Movement' check(length(category) between 1 and 60),
 youtube_id text not null check(youtube_id~'^[A-Za-z0-9_-]{11}$'), cues text not null default '' check(length(cues)<=4000),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.cgp_homework (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.cgp_profiles(id),
 exercise_id uuid not null references public.cgp_exercises(id), prescription text not null check(length(prescription) between 1 and 500),
 coach_note text not null default '' check(length(coach_note)<=2000), active boolean not null default true,
 created_at timestamptz not null default now()
);
create index cgp_homework_client on public.cgp_homework(client_id);
create index cgp_homework_exercise on public.cgp_homework(exercise_id);
create table public.cgp_homework_logs (
 id uuid primary key default gen_random_uuid(), homework_id uuid not null references public.cgp_homework(id) on delete cascade,
 client_id uuid not null references public.cgp_profiles(id), done_on date not null default (now() at time zone 'Europe/London')::date,
 created_at timestamptz not null default now(), unique(homework_id,done_on)
);
create index cgp_logs_client on public.cgp_homework_logs(client_id,done_on);
create table public.cgp_portal_settings (key text primary key check(key='youtube_channel'),value text not null default '' check(length(value)<=500));
insert into public.cgp_portal_settings values('youtube_channel','');
create table public.cgp_portal_invites (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.cgp_profiles(id),
 token_hash text not null unique, expires_at timestamptz not null default now()+interval '7 days', used_at timestamptz,
 created_at timestamptz not null default now()
);
create index cgp_invites_client on public.cgp_portal_invites(client_id);
create table public.cgp_wearable_connections (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.cgp_profiles(id),
 provider text not null check(provider in ('GARMIN','WHOOP','OURA','FITBIT','POLAR','SUUNTO','WITHINGS')),
 external_user_id text unique, status text not null default 'pending' check(status in ('pending','connected','revoked','error')),
 consent_at timestamptz not null default now(), consent_version text not null default '2026-10-10', synced_at timestamptz,
 created_at timestamptz not null default now(), unique(client_id,provider)
);
create table public.cgp_wearable_metrics (
 connection_id uuid not null references public.cgp_wearable_connections(id) on delete cascade,
 day date not null, kind text not null check(kind in ('daily','sleep')), source_id text not null,
 steps integer check(steps between 0 and 250000), sleep_seconds integer check(sleep_seconds between 0 and 86400),
 hrv_rmssd numeric check(hrv_rmssd between 0 and 1000), hrv_sdnn numeric check(hrv_sdnn between 0 and 1000),
 resting_hr numeric check(resting_hr between 10 and 250), measured_at timestamptz not null,
 received_at timestamptz not null default now(), primary key(connection_id,kind,source_id)
);
create index cgp_metrics_day on public.cgp_wearable_metrics(day desc);
create table cgp_private.portal_ingest_credentials(name text primary key,key_hash text not null);
revoke all on cgp_private.portal_ingest_credentials from public,anon,authenticated;

-- Explicit access grants and per-client isolation, including reads from outside the UI.
do $$ declare t text; begin
 foreach t in array array['cgp_profiles','cgp_session_credits','cgp_bookings','cgp_exercises','cgp_homework','cgp_homework_logs','cgp_portal_settings','cgp_portal_invites','cgp_wearable_connections','cgp_wearable_metrics'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select,insert,update on public.cgp_profiles,public.cgp_session_credits,public.cgp_bookings,public.cgp_exercises,public.cgp_homework,public.cgp_portal_settings to authenticated;
grant select,insert,delete on public.cgp_homework_logs to authenticated;
grant select on public.cgp_wearable_connections,public.cgp_wearable_metrics to authenticated;
create policy cgp_profiles_read on public.cgp_profiles for select to authenticated using(user_id=(select auth.uid()) or (select cgp_private.portal_admin()));
create policy cgp_profiles_insert on public.cgp_profiles for insert to authenticated with check((select cgp_private.portal_admin()) and role='athlete' and user_id is null);
create policy cgp_profiles_update on public.cgp_profiles for update to authenticated using((select cgp_private.portal_admin())) with check((select cgp_private.portal_admin()));
do $$ declare t text; begin
 foreach t in array array['cgp_session_credits','cgp_bookings','cgp_homework'] loop
 execute format('create policy own_read on public.%I for select to authenticated using(client_id=(select cgp_private.portal_id()) or (select cgp_private.portal_admin()))',t);
 execute format('create policy admin_insert on public.%I for insert to authenticated with check((select cgp_private.portal_admin()))',t);
 execute format('create policy admin_update on public.%I for update to authenticated using((select cgp_private.portal_admin())) with check((select cgp_private.portal_admin()))',t);
 end loop;
 foreach t in array array['cgp_exercises','cgp_portal_settings'] loop
 execute format('create policy member_read on public.%I for select to authenticated using((select cgp_private.portal_id()) is not null)',t);
 execute format('create policy admin_insert on public.%I for insert to authenticated with check((select cgp_private.portal_admin()))',t);
 execute format('create policy admin_update on public.%I for update to authenticated using((select cgp_private.portal_admin())) with check((select cgp_private.portal_admin()))',t);
 end loop;
end $$;
create policy logs_read on public.cgp_homework_logs for select to authenticated using(client_id=(select cgp_private.portal_id()) or (select cgp_private.portal_admin()));
create policy logs_insert on public.cgp_homework_logs for insert to authenticated with check(client_id=(select cgp_private.portal_id()) and done_on=(now() at time zone 'Europe/London')::date and exists(select 1 from public.cgp_homework h where h.id=homework_id and h.client_id=(select cgp_private.portal_id()) and h.active));
create policy logs_delete on public.cgp_homework_logs for delete to authenticated using(client_id=(select cgp_private.portal_id()));
create policy connections_read on public.cgp_wearable_connections for select to authenticated using(client_id=(select cgp_private.portal_id()) or (select cgp_private.portal_admin()));
create policy metrics_read on public.cgp_wearable_metrics for select to authenticated using(exists(select 1 from public.cgp_wearable_connections c where c.id=connection_id and c.status='connected' and (c.client_id=(select cgp_private.portal_id()) or (select cgp_private.portal_admin()))));

create function public.cgp_issue_portal_invite(p_client uuid) returns text language plpgsql security definer set search_path='' as $$
 declare token text;
 begin
 if auth.uid() is null or not cgp_private.portal_admin() then raise exception 'Admin access required'; end if;
 if not exists(select 1 from public.cgp_profiles where id=p_client and active) then raise exception 'Client unavailable'; end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 update public.cgp_portal_invites set used_at=now() where client_id=p_client and used_at is null;
 insert into public.cgp_portal_invites(client_id,token_hash) values(p_client,encode(sha256(convert_to(token,'UTF8')),'hex'));
 return token;
 end;
$$;
revoke all on function public.cgp_issue_portal_invite(uuid) from public,anon,authenticated;
grant execute on function public.cgp_issue_portal_invite(uuid) to authenticated;

-- Callable only by the invitation Edge Function after it has verified the secret link.
create function public.cgp_redeem_portal_invite(p_token text,p_user uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare invitation public.cgp_portal_invites; profile public.cgp_profiles; user_email text;
 begin
 select * into invitation from public.cgp_portal_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and used_at is null and expires_at>now() for update;
 if invitation.id is null then raise exception 'This access link has expired or has already been used'; end if;
 select * into profile from public.cgp_profiles where id=invitation.client_id and active for update;
 select lower(email) into user_email from auth.users where id=p_user and email_confirmed_at is not null;
 if profile.id is null or user_email is distinct from profile.email or (profile.user_id is not null and profile.user_id<>p_user) then raise exception 'Account does not match this invitation'; end if;
 update public.cgp_profiles set user_id=p_user where id=profile.id;
 update public.cgp_portal_invites set used_at=now() where id=invitation.id;
 return profile.id;
 end;
$$;
revoke all on function public.cgp_redeem_portal_invite(text,uuid) from public,anon,authenticated;
grant execute on function public.cgp_redeem_portal_invite(text,uuid) to service_role;

create function public.cgp_start_wearable(p_provider text) returns uuid language plpgsql security definer set search_path='' as $$
 declare client uuid:=cgp_private.portal_id(); connection uuid;
 begin
 if auth.uid() is null or client is null then raise exception 'Sign in first'; end if;
 if p_provider not in ('GARMIN','WHOOP','OURA','FITBIT','POLAR','SUUNTO','WITHINGS') then raise exception 'Unsupported device'; end if;
 delete from public.cgp_wearable_connections where client_id=client and provider=p_provider and status<>'connected';
 if exists(select 1 from public.cgp_wearable_connections where client_id=client and provider=p_provider) then raise exception 'This device is already connected'; end if;
 insert into public.cgp_wearable_connections(client_id,provider) values(client,p_provider) returning id into connection;
 return connection;
 end;
$$;
create function public.cgp_disconnect_wearable(p_connection uuid) returns text language plpgsql security definer set search_path='' as $$
 declare external_id text;
 begin
 if auth.uid() is null or cgp_private.portal_id() is null then raise exception 'Sign in first'; end if;
 update public.cgp_wearable_connections set status='revoked' where id=p_connection and client_id=cgp_private.portal_id() returning external_user_id into external_id;
 if not found then raise exception 'Connection unavailable'; end if;
 delete from public.cgp_wearable_metrics where connection_id=p_connection;
 return external_id;
 end;
$$;
revoke all on function public.cgp_start_wearable(text),public.cgp_disconnect_wearable(uuid) from public,anon,authenticated;
grant execute on function public.cgp_start_wearable(text),public.cgp_disconnect_wearable(uuid) to authenticated;

-- Server-authenticated, write-only integration endpoint. Never exposes tokens or raw health payloads.
create function public.cgp_ingest_wearable(p_key text,p_event jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare c public.cgp_wearable_connections; item jsonb; event_type text:=p_event->>'type';
 begin
 if p_key is null or not exists(select 1 from cgp_private.portal_ingest_credentials where name='terra' and key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex')) then raise exception 'Invalid ingest credential'; end if;
 if event_type='healthcheck' then return; end if;
 if event_type='auth' then
  update public.cgp_wearable_connections set external_user_id=p_event->>'user_id',status='connected' where id::text=p_event->>'reference_id' and provider=p_event->>'provider' and status='pending' and consent_at>now()-interval '1 day' and exists(select 1 from public.cgp_profiles p where p.id=client_id and p.active) and length(p_event->>'user_id')>0; return;
 end if;
 select * into c from public.cgp_wearable_connections where external_user_id=p_event->>'user_id' and status in ('connected','error') for update;
 if c.id is null then return; end if;
 if event_type='revoked' then update public.cgp_wearable_connections set status='revoked' where id=c.id; delete from public.cgp_wearable_metrics where connection_id=c.id; return; end if;
 if event_type='error' then update public.cgp_wearable_connections set status='error' where id=c.id; return; end if;
 if event_type='reauth' then update public.cgp_wearable_connections set external_user_id=p_event->>'new_user_id',status='connected' where id=c.id; return; end if;
 if c.status<>'connected' or event_type not in ('daily','sleep') or not exists(select 1 from public.cgp_profiles where id=c.client_id and active) then return; end if;
 for item in select * from jsonb_array_elements(p_event->'metrics') loop
  insert into public.cgp_wearable_metrics(connection_id,day,kind,source_id,steps,sleep_seconds,hrv_rmssd,hrv_sdnn,resting_hr,measured_at)
  values(c.id,(item->>'day')::date,event_type,item->>'source_id',(item->>'steps')::integer,(item->>'sleep_seconds')::integer,(item->>'hrv_rmssd')::numeric,(item->>'hrv_sdnn')::numeric,(item->>'resting_hr')::numeric,(item->>'measured_at')::timestamptz)
  on conflict(connection_id,kind,source_id) do update set steps=excluded.steps,sleep_seconds=excluded.sleep_seconds,hrv_rmssd=excluded.hrv_rmssd,hrv_sdnn=excluded.hrv_sdnn,resting_hr=excluded.resting_hr,measured_at=excluded.measured_at,received_at=now()
  where excluded.measured_at>=cgp_wearable_metrics.measured_at;
 end loop;
 update public.cgp_wearable_connections set synced_at=now() where id=c.id;
 delete from public.cgp_wearable_metrics where connection_id=c.id and day<current_date-90;
 end;
$$;
revoke all on function public.cgp_ingest_wearable(text,jsonb) from public,anon,authenticated;
grant execute on function public.cgp_ingest_wearable(text,jsonb) to anon;
