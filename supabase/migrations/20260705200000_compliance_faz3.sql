-- ============================================================================
-- Compliance Faz 3 — retention purge audit + push notification consent
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. retention_purge_runs — cron audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.retention_purge_runs (
  id            uuid primary key default gen_random_uuid(),
  ran_at        timestamptz not null default now(),
  rows_deleted  integer not null default 0,
  warnings_sent integer not null default 0,
  detail        jsonb not null default '{}'::jsonb
);

create index if not exists retention_purge_runs_ran_idx
  on public.retention_purge_runs (ran_at desc);

alter table public.retention_purge_runs enable row level security;
revoke all on public.retention_purge_runs from public, anon, authenticated;
grant select, insert on public.retention_purge_runs to service_role;

-- ---------------------------------------------------------------------------
-- 2. Push notification consent flag (transactional reminders)
-- ---------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists push_notifications_consent boolean not null default false;
