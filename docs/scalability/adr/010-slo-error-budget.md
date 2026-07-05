# ADR 010: SLOs and error budget

**Status:** Accepted · 2026-07-05  
**Context:** Scalability Faz 4

## Decision

1. Publish latency + availability SLOs in `lib/scalability/slo.ts` and `docs/scalability/slo.md`
2. Enforce health SLO in CI via k6 smoke (`p95 < 800ms`, `error rate < 1%`)
3. Error budget policy gates feature velocity when burn exceeds 50%

## Rationale

Without measurable SLOs, scale work is subjective. Health endpoint is auth-free and dependency-representative — suitable for CI gating. Authenticated endpoints monitored via Sentry/Vercel in production.

## Consequences

- CI adds ~2 min for build + k6 smoke job
- Production SLO breaches require runbook response, not ad-hoc fixes
