# Incident Response — Reliability

Last updated: 2026-07-05 · Audience: on-call operator

Unified severity taxonomy for **operational** incidents. Privacy/data breaches use
[breach-playbook.md](../compliance/breach-playbook.md) in parallel when personal data
is involved.

---

## Severity levels

| Level | Name | Examples | Response time | MTTR target |
|-------|------|----------|---------------|-------------|
| **P1** | Critical | Full outage, DB down, all AI circuits open, auth broken | 15 min ack | 30 min |
| **P2** | Major | Degraded mode active, single provider down, 5xx spike sustained | 30 min ack | 2 h |
| **P3** | Minor | Elevated latency, one cron failing, non-critical feature impaired | 4 h ack | 24 h |
| **P4** | Low | Cosmetic, docs drift, non-user-facing regression | Next business day | Best effort |

Code reference: `lib/reliability/incident-severity.ts`

---

## Triage flow

1. **Detect** — UptimeRobot `/api/health`, Sentry alert, user report, admin ops hub.
2. **Classify** — Map to P1–P4 using table above.
3. **Communicate** — P1/P2: status update within ack window (email / in-app if applicable).
4. **Mitigate** — Follow [RUNBOOK.md](../RUNBOOK.md) §8; use self-heal cron or admin endpoint.
5. **Resolve** — Confirm health probe green, degraded mode cleared, error rate normal.
6. **Review** — P1/P2: short post-incident note (what, when, root cause, action items).

---

## Quick commands

```bash
# Liveness (anonymous)
curl -s https://kaifyai.org/api/health

# Detailed dependency check (requires CRON_SECRET)
curl -s -H "Authorization: Bearer $CRON_SECRET" https://kaifyai.org/api/health

# Trigger self-heal manually (admin session required)
# POST /api/admin/self-heal
```

---

## Escalation matrix

| Condition | Action |
|-----------|--------|
| DB `down` in health | P1 — check Supabase status, connection pool, recent migration |
| Degraded mode active | P2 — inspect Sentry 5xx spike, recent deploy, `ERROR_SPIKE_THRESHOLD` |
| Single AI circuit open | P3 — fallback provider should serve; reset via self-recovery |
| Cron job `failed` in `cron_job_runs` | P3 — inspect Vercel cron logs, re-run manually |
| Personal data exposure suspected | **Also** invoke breach playbook (72 h regulatory clock) |

---

## Monitoring checklist (Faz 4 gate)

| Control | Target | Owner |
|---------|--------|-------|
| UptimeRobot `/api/health` | 99.9% | Operator |
| Sentry 5xx alert | < 10/h spike | Operator |
| Error budget review | Monthly | Engineering |
| Self-recovery cron | `ok` in `cron_job_runs` | Operator |
| Tabletop exercise | Quarterly | Engineering + legal (if PII) |

Signed tabletop record: [breach-tabletop-2026-07.md](../compliance/breach-tabletop-2026-07.md)
