# F3-16 — Capacity and AI cost (Phase 3)

**Date:** 2026-08-26  
**Status:** Path added; **no invented 1K / 10K / 100K numbers**.

## Load

`scripts/load-test/k6-hotpaths.js` now includes authenticated `GET /api/workout/plan`
with a p95 threshold matching the other hot paths. A k6 binary +
`K6_ACCESS_TOKEN` run was **not** executed in this phase. Previous public
health probe evidence remains [`k6-health-probe-2026-08-04.md`](./k6-health-probe-2026-08-04.md).

To archive a real hot-path result:

```bash
K6_VUS=20 K6_DURATION=60s BASE_URL=https://kaifyai.org \
  K6_ACCESS_TOKEN=<supabase_user_jwt> \
  npm run load-test:k6:hotpaths
```

## AI cost

Existing caps stay in env (`AI_COST_USER_DAILY_TOKENS_CAP`,
`AI_COST_PLATFORM_DAILY_USD_CAP`, `AI_COST_DAILY_ANOMALY_MULTIPLIER`) and
`/api/cron/cost-check`. This phase did not change those numbers and did not
project cost at 1K/10K/100K users.
