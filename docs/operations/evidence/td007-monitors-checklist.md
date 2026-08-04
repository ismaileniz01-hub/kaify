# Faz 3 — TD-007 operator monitors (checklist)

Code/docs shipped in Faz 3. Create these in the product UIs (cannot fully automate
without SaaS API tokens):

## 1. Uptime on `/api/health`

- URL: `https://kaifyai.org/api/health`
- Expect: HTTP 200, JSON `{"status":"ok",...}`
- Interval: 1–5 min
- User-Agent: browser-like (middleware allows health without bot block)
- Provider: UptimeRobot / Better Stack / Vercel Observability

## 2. Sentry alerts

In Sentry project for Kaify:

1. **Error spike** — issue alert when event volume > ~10× baseline or >10 5xx/hour
2. **Cron / job failure** — filter messages/tags for `cron` routes or create
   [Sentry Crons](https://docs.sentry.io/product/crons/) monitors for:
   - `leaderboard-snapshot`, `outbox`, `notifications`, `self-recovery`,
     `cost-check`, `backup-verification`

SDK already captures API 5xx via `lib/observability/capture.ts`.

## 3. After creating

Paste monitor URLs / rule IDs into this file and tick
`docs/operations/path-to-90-roadmap.md` TD-007 rows.
