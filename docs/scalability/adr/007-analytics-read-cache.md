# ADR 007: Analytics read cache

**Status:** Accepted · 2026-07-05  
**Context:** Scalability Faz 1

## Problem

`getAnalyticsBundle()` runs 4–6 DB queries plus Leo/Maya message scans for weekly score on every analytics page load. At 1k DAU this becomes a steady read load on `analytics_daily`, `health_steps`, and `chat_messages`.

## Decision

Cache per-user analytics read models in Upstash Redis:

- `analytics:bundle:v1:{userId}` — full bundle, TTL 120s
- `analytics:today:v1:{userId}` — home snapshot, TTL 120s

Invalidate both keys on any analytics write (`invalidateAnalyticsUserCache`).

Fail-open: cache miss or Redis error falls through to live DB (same as market/leaderboard).

## Consequences

- **Positive:** ~80% fewer analytics reads during repeat page views within 2 minutes
- **Negative:** Up to 120s staleness after manual DB edits (acceptable for fitness tracking UX)
- **Not cached:** Maya meal sync side-effects still run on cache miss only

## Alternatives considered

- Materialized view for weekly score — deferred to Faz 3 (leaderboard snapshot pattern)
- CDN edge cache — rejected (user-specific, auth-required)
