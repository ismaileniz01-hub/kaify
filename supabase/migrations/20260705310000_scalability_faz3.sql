-- ============================================================================
-- Scalability Faz 3 — leaderboard snapshot table (cron-refreshed read model)
-- ============================================================================

create table if not exists public.leaderboard_snapshots (
  snapshot_key  text primary key,
  payload       jsonb not null,
  refreshed_at  timestamptz not null default now()
);

create index if not exists leaderboard_snapshots_refreshed_idx
  on public.leaderboard_snapshots (refreshed_at desc);

comment on table public.leaderboard_snapshots is
  'Precomputed leaderboard read models refreshed by /api/cron/leaderboard-snapshot.';

alter table public.leaderboard_snapshots enable row level security;
revoke all on public.leaderboard_snapshots from public, anon, authenticated;
grant select, insert, update, delete on public.leaderboard_snapshots to service_role;
