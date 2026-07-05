# Service Level Objectives (SLO)

Last updated: 2026-07-05 · Scalability Faz 4

Code source: `lib/scalability/slo.ts`

## Availability targets

| Surface | SLO | Error budget (30d) | Measurement |
|---------|-----|-------------------|-------------|
| `/api/health` | 99.9% | ~43 min downtime | UptimeRobot + CI k6 smoke |
| Read APIs (auth) | 99.5% | ~3.6 h | Sentry 5xx rate + Vercel analytics |

## Latency targets (p95)

| Endpoint | p95 | p99 guard |
|----------|-----|-----------|
| `GET /api/health` | 800 ms | 1500 ms |
| `GET /api/market` | 150 ms | 400 ms |
| `GET /api/leaderboard` | 200 ms | 500 ms |
| `GET /api/analytics` | 400 ms | 900 ms |
| `GET /api/home` | 500 ms | 1200 ms |
| `POST /api/check-in` | 300 ms | 700 ms |
| `POST /api/chat/*` TTFB | 2000 ms | 5000 ms |

## CI enforcement

| Gate | Tool | Threshold |
|------|------|-----------|
| PR / main | k6 smoke (`scripts/load-test/k6-smoke.js`) | p95 < 800 ms, errors < 1% |
| Local / ops | `npm run load-test:smoke` | same |

## Error budget policy

1. **Budget > 50% remaining** — ship features normally
2. **Budget 25–50%** — freeze non-critical perf regressions; prefer cache/index fixes
3. **Budget < 25%** — scale-up week: no new AI features, focus on Redis hit rate + DB advisors
4. **Budget exhausted** — incident review; enable Supavisor; consider Vercel Pro concurrency bump

## Monitoring checklist

- [ ] UptimeRobot on `/api/health`
- [ ] Sentry alert: >10 errors / hour on 5xx
- [ ] Vercel Speed Insights p75 regression alert
- [ ] Supabase dashboard: connection count + slow queries weekly

See [autoscaling-runbook.md](./autoscaling-runbook.md) when SLO burn accelerates.
