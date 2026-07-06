-- Daily backup verification manifest (DR Faz 1)
-- Stores row-count snapshots + migration version for restore baseline comparison.

create table if not exists public.backup_verification_runs (
  id            uuid primary key default gen_random_uuid(),
  ran_at        timestamptz not null default now(),
  status        text not null check (status in ('ok', 'error', 'degraded')),
  migration_count integer,
  manifest      jsonb not null default '{}'::jsonb,
  detail        text
);

create index if not exists backup_verification_runs_ran_at_idx
  on public.backup_verification_runs (ran_at desc);

comment on table public.backup_verification_runs is
  'Daily DR manifest: table row counts and schema version for restore verification.';

alter table public.backup_verification_runs enable row level security;

revoke all on public.backup_verification_runs from public, anon, authenticated;
grant select, insert on public.backup_verification_runs to service_role;
