# TD-006 — Compliance evidence pack (Faz 6)

Date opened: 2026-08-04 · Owner: Engineering + Legal

Engineering delivers the **code/CI/ops** half. Counsel must still sign
`docs/compliance/legal-review-tracker.md` (minimum L1 + L2 + L4) before an
external auditor claim of “compliance 92+”.

## A — Automated (CI) — eng complete

| Check | Evidence |
|-------|----------|
| Export table completeness | `tests/compliance/export-completeness.test.ts` |
| Deletion cascade completeness | `tests/compliance/deletion-completeness.test.ts` |
| Retention schedule constants | `tests/compliance/retention-config.test.ts` |
| Consent / age gates | `tests/compliance/consent-gate.test.ts`, `age.test.ts` |
| Config sources | `lib/compliance/export-tables.ts`, `deletion-config.ts`, `retention-config.ts` |
| Runtime routes | `GET /api/profile/export`, `DELETE /api/profile`, cron `retention-purge` |

CI green on `main` after Faz 6 push = Section A satisfied.

## B — Manual ops drills (operator fill)

| Drill | Result | Date | Notes / artifact |
|-------|--------|------|------------------|
| Art. 15 export on throwaway user (redact PII before attach) | ☐ | | |
| Art. 17 delete + verify rows gone (SQL checklist in deletion-behavior.md) | ☐ | | |
| Retention purge heartbeat (`retention_purge_runs` latest row) | ☐ | | |
| `/privacy` + `/kvkk` HTTP 200 in prod | ☐ | | |

## C — Legal sign-off (counsel)

| Item | Status |
|------|--------|
| Tracker L1 Privacy EN | ☐ Pending — see `legal-review-tracker.md` |
| Tracker L2 Privacy TR/KVKK | ☐ Pending |
| Tracker L4 Art. 9 AI health consent | ☐ Pending |
| Sign-off block signed | ☐ Pending |

## D — Engineering acknowledgment

```
Engineering confirms Section A (code + CI) is complete as of 2026-08-04.
Sections B–C remain operator/legal before marketing a certified 92+ compliance score.
```

Signed (eng): __________________ Date: __________
