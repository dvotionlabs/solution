-- The ingest credential is provisioned separately, never committed here.
create schema if not exists cgp_private;
revoke all on schema cgp_private from public, anon, authenticated;
create table cgp_private.payment_ingest_credentials (name text primary key, key_hash text not null);
revoke all on cgp_private.payment_ingest_credentials from public, anon, authenticated;

create table public.cgp_payment_events (
 provider text not null check (provider in ('stripe','gocardless')),
 event_id text not null, event_type text not null,
 occurred_at timestamptz not null, received_at timestamptz not null default now(),
 payload jsonb not null,
 primary key(provider,event_id)
);
create table public.cgp_pack_orders (
 checkout_session_id text primary key, plan_id text not null,
 amount integer not null check(amount>0), currency text not null check(currency='gbp'),
 customer_email text, customer_name text,
 payment_status text not null check(payment_status in ('pending','paid','failed')),
 payment_intent_id text, event_at timestamptz not null, updated_at timestamptz not null default now()
);
alter table public.cgp_payment_events enable row level security;
alter table public.cgp_pack_orders enable row level security;
revoke all on public.cgp_payment_events,public.cgp_pack_orders from public,anon,authenticated;
grant all on public.cgp_payment_events,public.cgp_pack_orders to service_role;

-- Dedicated write-only capability. It grants no read or arbitrary SQL access.
create function public.cgp_record_payment_event(
 p_key text,p_provider text,p_event_id text,p_event_type text,p_created_at timestamptz,p_payload jsonb,p_order jsonb default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_key is null or not exists(select 1 from cgp_private.payment_ingest_credentials where name='cgp-webhooks' and key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex')) then
  raise exception 'Invalid ingest credential' using errcode='28000';
 end if;
 if p_provider not in ('stripe','gocardless') or length(p_event_id)>150 or length(p_event_id)<5 or length(p_event_type)>150 or octet_length(p_payload::text)>1000000 then
  raise exception 'Invalid event';
 end if;
 insert into public.cgp_payment_events(provider,event_id,event_type,occurred_at,payload)
 values(p_provider,p_event_id,p_event_type,p_created_at,p_payload)
 on conflict(provider,event_id) do nothing;
 if p_provider='stripe' and p_order is not null then
  insert into public.cgp_pack_orders(checkout_session_id,plan_id,amount,currency,customer_email,customer_name,payment_status,payment_intent_id,event_at)
  values(p_order->>'session_id',p_order->>'plan_id',(p_order->>'amount')::integer,p_order->>'currency',left(p_order->>'email',254),left(p_order->>'name',200),p_order->>'status',p_order->>'payment_intent_id',p_created_at)
  on conflict(checkout_session_id) do update set
   payment_status=case when cgp_pack_orders.payment_status='paid' then 'paid' else excluded.payment_status end,
   event_at=greatest(cgp_pack_orders.event_at,excluded.event_at),updated_at=now()
  where excluded.event_at>=cgp_pack_orders.event_at or excluded.payment_status='paid';
 end if;
end;
$$;
revoke all on function public.cgp_record_payment_event(text,text,text,text,timestamptz,jsonb,jsonb) from public;
grant execute on function public.cgp_record_payment_event(text,text,text,text,timestamptz,jsonb,jsonb) to anon;
