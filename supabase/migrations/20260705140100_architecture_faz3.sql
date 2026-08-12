-- ============================================================================
-- Architecture Faz 3 — domain events outbox
-- ============================================================================

create table if not exists public.domain_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,
  aggregate_id  text not null,
  user_id       uuid references auth.users (id) on delete set null,
  payload       jsonb not null default '{}'::jsonb,
  occurred_at   timestamptz not null default now(),
  processed_at  timestamptz
);

create index if not exists domain_events_unprocessed_idx
  on public.domain_events (occurred_at asc)
  where processed_at is null;

create index if not exists domain_events_type_idx
  on public.domain_events (event_type, occurred_at desc);

alter table public.domain_events enable row level security;
revoke all on public.domain_events from public, anon, authenticated;
grant select, insert, update on public.domain_events to service_role;
