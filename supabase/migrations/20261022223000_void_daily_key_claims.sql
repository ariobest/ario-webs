-- Daily public key issuance limit, keyed to a persistent browser identifier.
-- The Edge Function uses the service role; public clients receive no direct table access.
create table if not exists public.void_daily_key_claims (
  id uuid primary key default gen_random_uuid(),
  client_hash text not null,
  network_hash text,
  claim_date date not null default (timezone('utc', now())::date),
  key_id uuid,
  created_at timestamptz not null default now(),
  constraint void_daily_key_claims_client_day unique (client_hash, claim_date)
);

alter table public.void_daily_key_claims enable row level security;
revoke all on public.void_daily_key_claims from anon, authenticated;
