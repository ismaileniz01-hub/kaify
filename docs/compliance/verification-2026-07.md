# Compliance Verification Sprint — 2026-07

Status: **Template** — mark PASS/FAIL after staging/prod review  
Compliance Faz 4 · Target score: **90+**

---

## A — Code & migrations (prod)

- [ ] Faz 1 consent_records migration applied
- [ ] Faz 2 compliance migration applied (`compliance_faz2`)
- [ ] Faz 3 compliance migration applied (`compliance_faz3`)
- [ ] Retention purge cron scheduled (Vercel `0 2 * * 0`)
- [ ] Lemon Squeezy webhook HMAC verified
- [ ] AI consent gate on chat + analyze + team meeting
- [ ] Push consent on subscribe + native
- [ ] Cookie banner Accept/Reject only
- [ ] `/privacy`, `/terms`, `/cookies`, `/kvkk` return 200

---

## B — Automated evidence (CI)

- [ ] `tests/compliance/export-completeness.test.ts` → PASS
- [ ] `tests/compliance/deletion-completeness.test.ts` → PASS
- [ ] `tests/compliance/consent-gate.test.ts` → PASS
- [ ] `tests/compliance/age.test.ts` → PASS
- [ ] `tests/compliance/retention-config.test.ts` → PASS
- [ ] Purge cron heartbeat < 30 days (`retention_purge_runs`)

---

## C — Manual GDPR Art. 15–22 checklist

| Right | Test | Expected | Result |
|-------|------|----------|--------|
| Access | Export JSON as test user | All 23 tables present | |
| Portability | JSON machine-readable | schemaVersion + readme | |
| Erasure | Delete test account | No rows with user UUID in CASCADE tables | |
| Erasure | billing_events | user_id null, no profile link | |
| Rectification | Edit profile | Saved | |
| Withdraw AI | Revoke consent | Chat 403 until re-consent | |
| Withdraw push | Revoke + subscribe | 403 on push register | |
| Marketing opt-out | Toggle off | marketing_emails false | |
| Cookie reject | Reject banner | No analytics cookies | |

---

## D — Documentation

- [ ] [ropa.md](./ropa.md) current
- [ ] [breach-playbook.md](./breach-playbook.md) reviewed
- [ ] [dsar-process.md](./dsar-process.md) published internally
- [ ] [transfer-impact-assessment.md](./transfer-impact-assessment.md) exists
- [ ] [dpia-ai-fitness.md](./dpia-ai-fitness.md) exists
- [ ] [legal-review-tracker.md](./legal-review-tracker.md) signed or scheduled

---

## E — Legal (minimum for 90+)

- [ ] Privacy policy live at kaifyai.org/privacy
- [ ] Art. 9 AI consent text matches in-app modal
- [ ] Subprocessor list matches [subprocessors.md](./subprocessors.md)
- [ ] Avukat review scheduled or completed (see legal-review-tracker)

**If E incomplete → independent auditor max ~85**

---

## F — Prod deploy record

| Item | Value |
|------|-------|
| Deploy date | |
| Commit SHA | |
| Verified by | |

Signed off: __________ Date: __________
