# ADR 009: Leaderboard snapshot cron

**Status:** Accepted · 2026-07-05  
**Context:** Scalability Faz 3

## Problem

`get_global_leaderboard` runs a window function over all streak rows on every cache miss. At 10k+ users this becomes a recurring DB cost during traffic spikes.

## Decision

1. Cron `/api/cron/leaderboard-snapshot` every **15 minutes**
2. Store pre-mapped DTO arrays in `leaderboard_snapshots` (Postgres)
3. Warm Redis hot keys on each refresh
4. API reads: Redis → DB snapshot (< 15m) → live RPC fallback

Avatar signing remains on the response path (private storage).

## Consequences

- Leaderboard data may lag up to 15 minutes (acceptable for gamification UX)
- Cron + Redis double-write adds operational surface; mitigated by existing cron monitor
