# Reliability Verification Sprint — 2026-07

Target: **Güvenilirlik 92+** (Faz 1–4 gate)

## A — Health probes (Faz 1)

- [x] Anonymous `/api/health` returns 200 liveness
- [x] Detailed probe requires `CRON_SECRET`
- [x] DB down → 503 on detailed probe
- [x] Degraded mode reflected in detailed checks
- [ ] UptimeRobot configured on production URL

## B — Resilience primitives (Faz 2)

- [x] `lib/resilience` retry + circuit + taxonomy
- [x] `resilient()` used by AI clients
- [x] Self-recovery cron (`/api/cron/self-recovery`)
- [x] Degraded mode enter/exit via Redis
- [x] Unit tests: `tests/unit/resilience.test.ts`

## C — SLO & monitoring (Faz 3)

- [x] SLO constants in `lib/scalability/slo.ts`
- [x] k6 smoke CI gate (p95 < 800ms, error rate < 1%)
- [x] Error spike monitor → degraded mode
- [x] `cron_job_runs` telemetry for crons
- [ ] Sentry 5xx alert rule configured

## D — Incident readiness (Faz 4)

- [x] Incident severity taxonomy (`lib/reliability/incident-severity.ts`)
- [x] [incident-response.md](./incident-response.md)
- [x] Reliability ADRs 011–014
- [ ] Tabletop / post-incident template filed for ops incident

## E — Production evidence (manual)

| Control | Target | Evidence | Result |
|---------|--------|----------|--------|
| UptimeRobot `/api/health` | 99.9% | Dashboard screenshot | |
| Sentry 5xx spike | < 10/h | Alert rule ID | |
| Self-recovery cron | `ok` daily | `cron_job_runs` row | |
| Degraded mode drill | Clears within 15m | Manual test log | |
| Error budget review | Monthly | slo.md sign-off | |

## F — Functional checks

| Check | Expected | Result |
|-------|----------|--------|
| Spike → degraded | `enterDegradedMode` on threshold | |
| Self-heal clears degraded | Cron exits degraded when healthy | |
| Health detailed + degraded | `checks.degradedMode.status` | |
| RUNBOOK §8 linked | incident-response + reliability README | |

Signed: __________ Date: __________
