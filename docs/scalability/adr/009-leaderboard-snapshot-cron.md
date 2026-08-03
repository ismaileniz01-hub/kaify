# ADR 009: Leaderboard snapshot cron

**Status:** Accepted · 2026-07-05  
**Context:** Scalability Faz 3

## Problem

`get_global_leaderboard` runs a window function over all streak rows on every cache miss. At 10k+ users this becomes a recurring DB cost during traffic spikes.

## Decision

1. **Primary cadence:** Supabase **pg_cron + pg_net** every **15 minutes** → `GET /api/cron/leaderboard-snapshot` (see [`docs/operations/pg-cron-frequent-schedules.sql`](../../operations/pg-cron-frequent-schedules.sql)). Vercel Hobby cannot host sub-daily crons.
2. **Backup:** Vercel Cron daily (`vercel.json`) still hits the same route.
3. Store pre-mapped DTO arrays in `leaderboard_snapshots` (Postgres)
4. Warm Redis hot keys on each refresh (**~14m TTL** so keys survive between 15m ticks)
5. API reads: Redis → DB snapshot (< 15m) → live RPC fallback (in-process singleflight on miss)
6. Per-user `get_user_rank` cached in Redis (`lb:rank:v1:{userId}`, ~120s; invalidated on check-in)

On **Vercel Pro**, the same 15m expression may optionally move into `vercel.json`; until then pg_cron is required for freshness.

Avatar signing remains on the response path (private storage).

## Consequences

- Leaderboard data may lag up to 15 minutes (acceptable for gamification UX)
- Cron + Redis double-write adds operational surface; mitigated by existing cron monitor
