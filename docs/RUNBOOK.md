# Kaify — Operations Runbook

Operational reference for running Kaify in production. Audience: whoever is on
call. Keep this file up to date when infra changes.

**Pre-deploy / return checklist:** see [`docs/DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md).

## 1. System overview

| Layer            | Technology                              | Notes |
| ---------------- | --------------------------------------- | ----- |
| Web + API        | Next.js 15 (App Router) on **Vercel**   | Single deployable; API routes under `app/api/**` |
| Database / Auth  | **Supabase** (Postgres 17, RLS, Auth)   | Project `Kaify Ai` (`urnetodzvszmddzdazdj`), region eu-central-1 |
| Rate limiting / cache | **Upstash Redis** (REST)           | Fail-closed for limits, fail-open for cache |
| Scheduled jobs   | **Supabase pg_cron** + Vercel Cron      | Notifications via pg_cron (2h); cleanup via Vercel cron |
| Error tracking   | **Sentry**                              | `@sentry/nextjs`, release = commit SHA |
| Push             | Web Push (VAPID) + **FCM** (native)     | Capacitor app on iOS/Android |
| Auth model       | **OTP-only** (email magic link/code)    | No passwords → password-related settings are N/A |

Request flow: `middleware.ts` (IP rate limit, bot/origin checks, CSP nonce,
`x-request-id`) → route handler → service layer (`lib/services/**`) → Supabase
RPC/tables. Every response carries `X-Request-ID` for correlation.

## 2. Environments & access

- **Production**: https://kaifyai.org (Vercel project `kaify`).
- **Supabase dashboard**: project `urnetodzvszmddzdazdj`.
- **Vercel dashboard**: project `kaify` (org `ismaileniz01-hubs-projects`).

Secrets live in Vercel env vars and `.env.local` (never committed). The full
list of required/optional keys is in `.env.example`.

## 3. Deploy

Standard deploy is `git push` to `main` (Vercel auto-deploys) after CI is green.

Manual deploy from a clean local tree:

```bash
npm run ci          # lint + typecheck + tests/coverage + build (must pass)
npx vercel --prod   # deploy current code to production
```

Verify after deploy:

```bash
curl -s -A "Mozilla/5.0" https://kaifyai.org/api/health   # expect {"status":"ok",...}
```

### Rollback

Vercel keeps every deployment. To revert:

1. Vercel dashboard → project → **Deployments**.
2. Find the last known-good deployment → **⋯ → Promote to Production**
   (or `vercel rollback <deployment-url>`).

Code rollback ≠ DB rollback. If a bad migration shipped, write a **forward-fix
migration** (see §5). Never edit an already-applied migration file.

## 4. Environment variables

Critical (app will not function without these — validated at boot by
`lib/startup/validate-env.ts`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Important (degraded behaviour if missing):

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — **rate limiting fails
  closed in production if absent** (requests get 429/500). Health check reports
  `down`.
- `CRON_SECRET` — gates `/api/cron/*` and the detailed `/api/health` output.
  Must have **no leading/trailing whitespace** (Vercel rejects it otherwise).
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — error tracking.
- `SENDER_API_KEY` — waitlist/subscribe (Sender.net).
- `VAPID_*`, Firebase (`FCM`) creds — push notifications.

After changing an env var in Vercel, **redeploy** for it to take effect.

## 5. Database & migrations

- Migrations live in `supabase/migrations/*.sql`, timestamp-prefixed, applied in
  order. They are **append-only** — never rewrite an applied file.
- Apply via the Supabase MCP `apply_migration` (DDL) or the Supabase CLI.
- After **any** schema change, run the advisors and fix new findings:
  - Security advisor and Performance advisor (Supabase dashboard → Advisors, or
    MCP `get_advisors`).
- Key invariants enforced in-DB (do not bypass with the service role casually):
  - RLS is default-deny; user-scoped reads use the anon+JWT (authenticated)
    client so RLS applies. Service-role is only for server-authoritative writes.
  - Money/streak logic is in `SECURITY DEFINER` RPCs scoped by `auth.uid()`
    (`perform_daily_check_in`, `earn_gems`, `spend_gems`,
    `check_and_increment_usage`, `process_referral`). These are intentionally
    callable by `authenticated` — the advisor warning is expected.

## 6. Scheduled jobs

- **Notifications** — Supabase `pg_cron`, every 2h, calls
  `GET /api/cron/notifications` with `Authorization: Bearer $CRON_SECRET` via
  `pg_net` (30s timeout). Timezone-aware, paginates profiles in pages of 1000,
  dedup keys make re-runs idempotent.
- **Cleanup** — Vercel Cron `GET /api/cron/cleanup` (daily 03:00 UTC): prunes
  expired idempotency keys, etc.
- **Cost check** — Vercel Cron `GET /api/cron/cost-check` (every 6h): compares
  today's AI spend vs 7-day average, flags heavy users and quota blocks into
  `cost_alerts`.
- **Self-recovery** — Vercel Cron `GET /api/cron/self-recovery` (every 15m):
  probes DB and clears degraded mode / open circuit breakers when healthy.

Check pg_cron status in Supabase SQL editor:

```sql
select jobid, schedule, active, jobname from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

If notifications stop: verify the job is `active`, `CRON_SECRET` matches, and
`job_run_details` has no HTTP errors/timeouts.

## 7. Observability

- **Logs**: structured single-line JSON (`lib/logger.ts`) in Vercel logs. Filter
  by `requestId` to trace one request end-to-end (matches the `X-Request-ID`
  response header). Sensitive keys are auto-redacted.
- **Errors**: server 5xx and unexpected throws are sent to Sentry from
  `handleApiError` (4xx client errors are not, by design). Events are tagged
  with `error_code` and the deploy `release`.
- **Health**: `GET /api/health` — coarse `{status,timestamp}` for anonymous
  callers (200 healthy / 503 critical). Full dependency detail requires
  `Authorization: Bearer $CRON_SECRET`.
- **Operator hub**: `/admin` — users, today's AI cost, degraded mode, env flags.
  Sub-pages: `/admin/costs` (token/USD ledger), `/admin/self-heal`,
  `/admin/audit` (admin action trail).
- **AI cost ledger**: every DeepSeek/Gemini call writes to `ai_usage_ledger`
  (estimated USD from `AI_COST_*` env rates). Anomalies land in `cost_alerts`.
  Tune thresholds: `AI_COST_USER_DAILY_TOKENS_ALERT`,
  `AI_COST_DAILY_ANOMALY_MULTIPLIER`.

## 8. Incident response

1. **Triage**: `curl -A "Mozilla/5.0" https://kaifyai.org/api/health`. If 503,
   the detail (with `CRON_SECRET`) shows which dependency is down.
2. **Check Sentry** for the error spike; grab a `request_id`.
3. **Check Vercel logs** filtered by that `request_id`.
4. **Mitigate**:
   - Bad deploy → rollback (§3).
   - Bad migration → forward-fix migration (§5).
   - Dependency down → see §9.

## 9. Common failures & fixes

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| All API returns 429/500, health `rateLimiter: down` | Upstash down or env missing | Restore `UPSTASH_*`; confirm Upstash service; limiter is fail-closed in prod by design |
| `/api/cron/*` returns 401 | `CRON_SECRET` mismatch/whitespace | Reset secret in Vercel + pg_cron header; redeploy |
| Notifications not sent | pg_cron inactive / pg_net timeout | See §6; re-schedule with higher `timeout_milliseconds` |
| Health `database: down` | Supabase outage / bad service key | Check Supabase status; verify `SUPABASE_SERVICE_ROLE_KEY` |
| AI chat failing, health `ai: degraded/down` | Provider outage → circuit breaker open | Wait for breaker half-open; check provider status/keys |
| Waitlist signups failing | `SENDER_API_KEY` missing/invalid | Set key in Vercel; retry |
| Build fails in CI on env | Missing build-safe placeholder | Placeholders are set in `.github/workflows/ci.yml` |

## 10. Local development

```bash
npm ci
cp .env.example .env.local   # fill in secrets
npm run dev
```

Before pushing: `npm run ci` must pass. New logic needs unit tests; the coverage
gate is enforced in `vitest.config.ts`.
