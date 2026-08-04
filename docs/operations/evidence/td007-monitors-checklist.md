# Faz 3 / 6 — TD-007 operator monitors (checklist)

Code/docs shipped. Create these in product UIs (needs SaaS login — not fully
automatable without API tokens).

## 1. Uptime on `/api/health`

| Field | Value |
|-------|-------|
| URL | `https://kaifyai.org/api/health` |
| Expect | HTTP 200, JSON `status: ok` |
| Interval | 1–5 min |
| User-Agent | browser-like |
| Provider | UptimeRobot / Better Stack / Vercel Observability |
| **Monitor URL / ID** | ☐ _paste here_ |
| Created date | |

## 2. Sentry alerts

| Alert | Rule ID / URL | Created |
|-------|---------------|---------|
| Error spike (>~10× baseline or >10 5xx/hour) | ☐ | |
| Cron: `leaderboard-snapshot` | ☐ | |
| Cron: `outbox` | ☐ | |
| Cron: `notifications` | ☐ | |
| Cron: `self-recovery` | ☐ | |
| Cron: `cost-check` | ☐ | |
| Cron: `backup-verification` | ☐ | |

SDK already captures API 5xx via `lib/observability/capture.ts`.

## 3. Eng half (done)

- [x] Checklist + capture path documented (2026-08-04)
- [x] Backup verification evidence archived
- [x] Incident runbook linked

## 4. Close criteria

When rows above have real IDs/URLs, tick TD-007 in
`docs/operations/path-to-90-roadmap.md` and set register status to **Done**.
