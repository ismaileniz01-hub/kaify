# Autoscaling & Capacity Runbook

Last updated: 2026-07-05 · Scalability Faz 4

Use when p95 latency exceeds [SLO](./slo.md) for >15 minutes or error budget burn > 2× normal.

## 1. Triage (5 min)

```bash
curl -s -A "Mozilla/5.0" https://kaifyai.org/api/health
# Detail (operator):
curl -s -H "Authorization: Bearer $CRON_SECRET" https://kaifyai.org/api/health
```

| Check | Healthy | Action if down |
|-------|---------|----------------|
| `database` | ok | Supabase status page; verify service key |
| `rateLimiter` | ok | Upstash dashboard; restore `UPSTASH_*` |
| `ai` | ok/degraded | Provider status; circuit breaker clears via self-recovery cron |

## 2. Vercel (compute)

| Symptom | Likely cause | Mitigation |
|---------|--------------|------------|
| Cold-start spikes | Low traffic + serverless | Increase cron frequency (leaderboard-snapshot 15m keeps warm); traffic burst |
| 429 from edge | Rate limit too aggressive | Confirm Upstash healthy (fail-closed); check attack traffic in logs |
| Function timeout | AI or N+1 | Chat already 60s max; check leaderboard avatar batch path |
| Regional latency | Single region | Vercel Pro: enable additional region if EU users grow |

**Scale levers (no code change):**
- Vercel → Project → Settings → **Functions** → increase `maxDuration` only for chat (already 60s)
- Enable **Fluid Compute** / concurrency if on Pro plan
- Promote last-good deployment if bad release (see RUNBOOK §3)

## 3. Supabase (database)

| Users | Action |
|-------|--------|
| < 10k | Current direct REST — no change |
| 10k–25k | Enable [Supavisor](./supavisor-pooling.md) for any raw SQL workers |
| 25k+ | Upgrade compute tier; run Performance Advisor; consider read replica for leaderboard RPC |

**Quick wins:**
- Supabase Advisors → fix new `auth_rls_initplan` / missing index warnings
- Verify `leaderboard-snapshot` cron active (`cron_job_runs`)
- Check `ai_usage_ledger` growth — retention purge cron weekly

## 4. Redis (Upstash)

| Symptom | Fix |
|---------|-----|
| Cache miss storm | Confirm cron warms `lb:global:v1:50:0`; check Upstash memory |
| Rate limit false positives | Increase bucket only after abuse review |
| Latency | Upgrade Upstash plan or region (eu-central-1 aligned with Supabase) |

## 5. AI providers

- Circuit breaker open → wait 15m self-recovery or manual `/admin/self-heal`
- Cost spike → `/admin/costs`; tighten `AI_COST_*` alert env vars
- Quota exhaustion → expected; users see 429 — not infra scale issue

## 6. Rollback order

1. Vercel deployment rollback
2. Disable feature flag (if applicable) via env
3. Forward-fix migration — never revert applied SQL
4. Post-incident: update [verification sprint](./verification-2026-07.md)

## 7. Post-scale verification

```bash
npm run load-test:smoke https://kaifyai.org 20 30
# or
BASE_URL=https://kaifyai.org k6 run scripts/load-test/k6-smoke.js
```

Target: p95 < 800 ms on health, 0% errors.

Contact: support@kaifyai.org
