# Scalability Verification Sprint — 2026-07

Target: **Ölçeklenebilirlik 90+** (Faz 1–4 gate)

## A — Database (Faz 1)

- [x] RLS initplan migration
- [x] Faz 1 sweep migration file
- [ ] Apply Faz 1 + Faz 3 migrations to Supabase (operator)

## B — Application cache (Faz 2)

- [x] Analytics + home + coaches cache
- [x] Batch avatar signing

## C — Leaderboard snapshot (Faz 3)

- [x] `leaderboard_snapshots` table + cron
- [ ] Verify `cron_job_runs` shows `leaderboard-snapshot` ok

## D — SLO & CI (Faz 4)

- [x] `lib/scalability/slo.ts` + `docs/scalability/slo.md`
- [x] k6 smoke in CI (`.github/workflows/ci.yml`)
- [x] `npm run load-test:k6` + `load-test:smoke`
- [x] Autoscaling runbook

## E — Production monitoring (manual)

| Control | Target | Evidence | Result |
|---------|--------|----------|--------|
| UptimeRobot `/api/health` | 99.9% | Uptime dashboard | |
| Sentry 5xx alert | <10/h spike | Alert rule | |
| k6 CI green on main | p95 < 800ms | GitHub Actions | |
| Prod load smoke | p95 < 800ms | `npm run load-test:smoke` | |
| Error budget review | Monthly | slo.md policy | |

## F — Functional checks

| Check | Expected | Result |
|-------|----------|--------|
| Leaderboard 2nd request | Redis/snapshot hit | |
| Check-in clears home cache | Fresh streak | |
| Autoscaling runbook linked | RUNBOOK + scalability README | |

Signed: __________ Date: __________
