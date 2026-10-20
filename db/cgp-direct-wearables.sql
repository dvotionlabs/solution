-- CGP direct WHOOP / Oura OAuth credentials: encrypted client-side of the database,
-- with AES-GCM performed on the CGP server using CGP_DIRECT_TOKEN_KEY.
-- App never stores bearer tokens in client-accessible plaintext.
create table if not exists public.cgp_direct_wearable_tokens (
 connection_id uuid primary key references public.cgp_wearable_connections(id) on delete cascade,
 token_ciphertext text not null check (length(token_ciphertext) between 20 and 8192),
 updated_at timestamptz not null default now(),
 last_sync_attempt_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.cgp_direct_wearable_tokens enable row level security;
revoke all on public.cgp_direct_wearable_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.cgp_direct_wearable_tokens to authenticated;

-- Credentials are accessible only to the consented athlete's own authenticated
-- portal profile, never to other athletes or to coaches through the data API.
drop policy if exists cgp_direct_token_owner on public.cgp_direct_wearable_tokens;
create policy cgp_direct_token_owner on public.cgp_direct_wearable_tokens
 for all to authenticated
 using (
  exists (
   select 1 from public.cgp_wearable_connections c
   join public.cgp_profiles p on p.id=c.client_id
   where c.id=connection_id
    and p.active=true and p.user_id=(select auth.uid())
    and c.status in ('pending','connected','error')
  )
 )
 with check (
  exists (
   select 1 from public.cgp_wearable_connections c
   join public.cgp_profiles p on p.id=c.client_id
   where c.id=connection_id
    and p.active=true and p.user_id=(select auth.uid())
    and c.status in ('pending','connected','error')
  )
 );
create index if not exists cgp_direct_tokens_last_sync
 on public.cgp_direct_wearable_tokens(last_sync_attempt_at)
 where last_sync_attempt_at is not null;
