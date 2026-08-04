# Faz 3 evidence — backup verification (2026-08-04)

Source: `public.backup_verification_runs` on project `urnetodzvszmddzdazdj`.

| ran_at (UTC) | status | id |
|--------------|--------|----|
| 2026-08-04 03:24:21 | ok | 5b31d106-b659-46d7-90f6-70815c8669a7 |
| 2026-08-03 03:15:51 | ok | 838c149b-2de3-412b-b8bc-5772c8119477 |
| 2026-08-02 03:15:51 | ok | 4e663c7e-bc53-47b5-8978-36eff32792b2 |
| 2026-08-01 03:15:51 | ok | 1221b6e1-f541-414e-9b19-b809dcdd1eb4 |
| 2026-07-31 03:15:51 | ok | 865165fb-b9de-4c70-b067-f1dff8fe27a9 |
| 2026-07-30 03:15:51 | ok | 14bbff2d-ce4b-4a55-ab89-4dcf159af2d5 |
| 2026-07-29 03:15:52 | ok | a89372b0-b0b9-4eee-9964-1ea59e3dafbb |

Cron: Vercel daily `/api/cron/backup-verification` (`vercel.json`) + service
`lib/services/backup-verification.service.ts`.

**Verdict:** 7 consecutive daily `ok` rows — backup verification path healthy.
