create table if not exists public.cgp_enquiries (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 submitted_on date not null default (now() at time zone 'UTC')::date,
 name text not null check (char_length(name) between 2 and 100),
 email text not null check (char_length(email) between 5 and 254 and email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 coaching text not null check (coaching in ('in_person','live_online','online_programming','not_sure')),
 message text not null check (char_length(message) between 10 and 2000),
 consent boolean not null check (consent = true),
 unique (email,submitted_on)
);
alter table public.cgp_enquiries enable row level security;
revoke all on public.cgp_enquiries from anon, authenticated;
grant insert (name,email,coaching,message,consent) on public.cgp_enquiries to anon;
grant all on public.cgp_enquiries to service_role;
create policy "Public can submit coaching enquiries" on public.cgp_enquiries for insert to anon with check (consent = true);
comment on table public.cgp_enquiries is 'CG Performance coaching enquiries. Public insertion only; no public reading or editing.';
