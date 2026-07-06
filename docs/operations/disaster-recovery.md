# Disaster Recovery & Backup — Kaify

Last updated: 2026-07-06 · Owner: Engineering / Ops

## Objectives

| Metric | Target |
|--------|--------|
| **RPO** (max data loss) | 24 h (daily Supabase backup + daily manifest) |
| **RTO** (time to restore service) | 4 h (code rollback 15 min + DB restore 1–3 h) |
| **Backup frequency** | Daily automated (Supabase + manifest cron) |
| **Restore drill** | Quarterly |

---

## What is backed up automatically

| Layer | Mechanism | Retention |
|-------|-----------|-----------|
| **Postgres (Supabase)** | Supabase daily backups (Pro plan) + optional PITR | 7 days (daily); PITR per plan |
| **Auth users** | Included in Postgres backup | Same |
| **Storage (avatars)** | Included in Supabase project backup | Same |
| **DR manifest** | Vercel cron `GET /api/cron/backup-verification` daily 01:00 UTC | Rows in `backup_verification_runs` |
| **Application code** | Git `main` + Vercel deployment history | Indefinite (Git) |
| **Redis (Upstash)** | Cache only — **not source of truth** | Rebuild from DB on loss |
| **Secrets** | Vercel env vars — export manually to password manager | Operator responsibility |

Enable **Point-in-Time Recovery (PITR)** in Supabase dashboard → Project Settings → Database → Backups for RPO &lt; 24 h.

---

## Daily backup verification cron

Schedule: **daily 03:00 UTC** via [`/api/cron/cleanup`](../app/api/cron/cleanup/route.ts) (bundled with idempotency maintenance).

Each run records:
- Row counts for 8 critical tables
- Latest applied migration version
- Avatar storage object sample count
- Git commit SHA (`VERCEL_GIT_COMMIT_SHA`)

Query recent manifests:

```sql
select ran_at, status, migration_count, manifest->'tables' as tables, detail
from public.backup_verification_runs
order by ran_at desc
limit 7;
```

**Alert if:** `status = 'error'` or row counts drop &gt;20% vs prior day without planned migration.

---

## Restore procedures

### A — Bad deploy (code only, DB intact)

1. Vercel dashboard → Deployments → last good → **Promote to Production**
2. Verify: `curl https://kaifyai.org/api/health`
3. Record incident in [`docs/reliability/incident-response.md`](../reliability/incident-response.md)

**RTO:** ~15 minutes

### B — Bad migration (schema/data corruption)

1. **Stop writes:** disable deploys; communicate P1 if user-facing
2. **Do not** edit applied migration files — write forward-fix only if rollback not possible
3. Supabase dashboard → Database → Backups → **Restore** to timestamp before incident  
   OR contact Supabase support for PITR restore
4. Re-apply any migrations that were valid after restore point (careful ordering)
5. Redeploy known-good Vercel commit matching schema
6. Compare `backup_verification_runs` manifest before/after

**RTO:** 1–4 hours depending on backup size

### C — Full region / project loss

1. Create new Supabase project in same region (eu-central-1)
2. Restore from latest backup export or Supabase support recovery
3. Update Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, keys
4. Redeploy application
5. Reconfigure pg_cron notification job with new project URL + `CRON_SECRET`
6. Verify Upstash Redis (create new instance if needed; cache cold-start OK)

**RTO:** 4–8 hours

### D — Redis (Upstash) loss

No restore required. Rate limits fail-closed until Upstash restored; cache repopulates from DB on read.

---

## Manual backup export (operator)

For off-site copy before major migration:

```bash
# Requires Supabase CLI linked to project + database password
supabase db dump --linked -f backup-$(date +%Y%m%d).sql
```

Store encrypted `.sql` in secure object storage (not git).

---

## Quarterly restore drill checklist

- [ ] Restore staging clone from production backup (Supabase branch or new project)
- [ ] Run `npm run ci` against restored staging
- [ ] Verify login, check-in, chat, export flows
- [ ] Compare `backup_verification_runs` manifest counts ±5%
- [ ] Document drill date in this file (see log below)
- [ ] Time the drill — target RTO &lt; 4 h

### Drill log

| Date | Operator | Scenario | RTO achieved | Notes |
|------|----------|----------|--------------|-------|
| _pending_ | | B — staging restore | | |

---

## Related docs

- [`RUNBOOK.md`](../RUNBOOK.md) — operations
- [`DEPLOY_CHECKLIST.md`](../DEPLOY_CHECKLIST.md)
- [`incident-response.md`](../reliability/incident-response.md)
- Supabase: [Database Backups](https://supabase.com/docs/guides/platform/backups)

Contact: support@kaifyai.org
