# ADR 013: Health probe auth model

**Status:** Accepted · 2026-07-05  
**Context:** Reliability Faz 1

## Decision

1. **Anonymous** callers receive cheap liveness only: `{ status: "ok", timestamp }`
2. **Detailed** dependency checks (DB, storage, Upstash, AI circuits, degraded mode) require `CRON_SECRET` via `Authorization: Bearer` or `x-cron-secret`
3. Detailed probe returns **503** when critical dependencies (DB, rate limiter) are `down`
4. Non-critical impairments (storage, AI partial) return **200** with `status: "ok"` and degraded checks

## Rationale

Public health endpoints must not amplify load (N+1 DB probes from bots). Monitors
and cron jobs hold the secret and perform full dependency validation.

## Consequences

- UptimeRobot uses anonymous liveness (200 = up)
- Internal monitors use detailed probe for dependency truth
- CI k6 smoke targets anonymous endpoint (SLO-aligned)
