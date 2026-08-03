# 10k go-live checklist

Do these in order. Code in PR #17 is not enough without the ops steps.

## A. Merge & hosting

1. [ ] Disconnect or ignore Netlify project `kaifyai` on the GitHub repo (it fails every PR and is not the production host).
2. [ ] Merge [PR #17](https://github.com/ismaileniz01-hub/kaify/pull/17) (includes security tip from #16 — close #16 after).
3. [ ] Confirm Vercel project `kaify` / `kaify-main` deploys green on `main`.

## B. Database

1. [ ] Apply migrations on production Supabase (in order):
   - `20260803120000_claim_pending_streak_rewards.sql`
   - `20260803140000_scale_faz3_cost_outbox.sql`
2. [ ] Verify RPCs exist:
   ```sql
   select proname from pg_proc
   where proname in (
     'claim_pending_streak_rewards',
     'service_get_ai_cost_snapshot',
     'admin_get_cache_hit_stats',
     'service_get_outbox_backlog'
   );
   ```

## C. Frequent crons (required on Hobby)

Vercel Hobby cannot run sub-daily crons. Production freshness needs pg_cron:

1. [ ] Edit and run [`pg-cron-frequent-schedules.sql`](./pg-cron-frequent-schedules.sql)
   - replace `__APP_BASE_URL__` and `__CRON_SECRET__`
2. [ ] Confirm jobs:
   ```sql
   select jobname, schedule, active from cron.job order by jobname;
   ```
3. [ ] After ~15–30 minutes, confirm `cron_job_runs` shows `leaderboard-snapshot` / `outbox` ok.

## D. Env (Vercel production)

| Var | Suggested |
|-----|-----------|
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Required |
| `CRON_SECRET` | Same as pg_cron |
| `CSRF_SECRET` / `ADMIN_HUB_PASSWORD` | Required (no service-role fallback) |
| `AI_COST_PLATFORM_DAILY_USD_CAP` | `75` default (raise if needed; `0` disables) |
| `AI_COST_PLATFORM_PRESSURE_RATIO` | `0.7` |
| `AI_COST_USER_DAILY_TOKENS_CAP` | `150000` |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Recommended |

## E. Load proof

```bash
# CI-style anonymous
npm run load-test:k6

# Staging authenticated hot paths (need a user JWT)
K6_ACCESS_TOKEN=eyJ... BASE_URL=https://your-staging \
  K6_VUS=20 K6_DURATION=60s \
  k6 run scripts/load-test/k6-hotpaths.js
```

Pass bar (soft): error rate &lt; 2%, session/home/leaderboard p95 &lt; 500ms at 20 VUs.

## F. Smoke after go-live

1. [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://kaifyai.org/api/health`
2. [ ] Manual check-in → leaderboard rank updates within ~2 minutes (cache TTL)
3. [ ] Admin `/admin/costs` loads without timeout
4. [ ] Sentry receiving events; no spike of 429 on `/api/session`
