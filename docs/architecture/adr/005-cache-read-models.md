# ADR 005: Redis Read-Through Cache for Shared Read Models

**Status:** Accepted · 2026-07-05

## Context

Leaderboards and market catalog are read-heavy and shared across users.

## Decision

- Upstash Redis via `lib/cache.ts` — **fail-open** (never blocks requests)
- Central keys in `lib/cache/keys.ts`
- Leaderboards use `cachedWithStale` (60s hot + 1h stale fallback)

## Consequences

- (+) Reduced DB load at scale
- (+) Graceful degradation without Redis
- (−) Eventual consistency (≤60s for leaderboards)
