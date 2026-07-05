# Kaify Compliance Documentation

Last updated: 2026-07-05 · **Compliance Faz 4 complete (82 → 90+ target)**

Privacy contact: **privacy@kaifyai.org** · DPO contact point: same  
Security: **support@kaifyai.org** · [security.txt](https://kaifyai.org/.well-known/security.txt)

---

## Public legal pages

| Page | URL |
|------|-----|
| Privacy Policy | `/privacy` |
| Terms & Conditions | `/terms&conditions` |
| Cookie Policy | `/cookies` |
| KVKK Aydınlatma | `/kvkk` |

---

## Core registers & policies

| Document | Purpose |
|----------|---------|
| [ropa.md](./ropa.md) | Full Record of Processing Activities |
| [lawful-basis-register.md](./lawful-basis-register.md) | Legal basis per data category |
| [retention-policy.md](./retention-policy.md) | Retention + automated purge |
| [deletion-behavior.md](./deletion-behavior.md) | Account delete CASCADE behavior |
| [subprocessors.md](./subprocessors.md) | Third-party processors |

---

## Risk & transfer

| Document | Purpose |
|----------|---------|
| [dpia-ai-fitness.md](./dpia-ai-fitness.md) | AI health processing DPIA |
| [transfer-impact-assessment.md](./transfer-impact-assessment.md) | International transfers |
| [transfer-signing-checklist.md](./transfer-signing-checklist.md) | DPA/SCC signing tracker |
| [subprocessor-change-process.md](./subprocessor-change-process.md) | 30-day change notification |

---

## Operations

| Document | Purpose |
|----------|---------|
| [dsar-process.md](./dsar-process.md) | Data subject requests (30-day SLA) |
| [breach-playbook.md](./breach-playbook.md) | 72h breach response |
| [breach-tabletop-2026-07.md](./breach-tabletop-2026-07.md) | Tabletop exercise record |
| [sentry-retention.md](./sentry-retention.md) | Post-delete third-party retention |
| [staff-access-policy.md](./staff-access-policy.md) | Production access (solo dev) |

---

## Governance & verification

| Document | Purpose |
|----------|---------|
| [verification-2026-07.md](./verification-2026-07.md) | **90+ gate checklist** |
| [annual-self-assessment-2026.md](./annual-self-assessment-2026.md) | Yearly review |
| [legal-review-tracker.md](./legal-review-tracker.md) | Counsel sign-off tracker |
| [policy-changelog.md](./policy-changelog.md) | Policy version history |
| [dpa-template.md](./dpa-template.md) | Enterprise B2B DPA template |

---

## Automated tests (CI)

- `tests/compliance/export-completeness.test.ts`
- `tests/compliance/deletion-completeness.test.ts`
- `tests/compliance/consent-gate.test.ts`
- `tests/compliance/age.test.ts`
- `tests/compliance/retention-config.test.ts`

---

## Phase summary

| Phase | Target | Status |
|-------|--------|--------|
| Faz 1 | 55 | Policies, cookie banner, consent UI |
| Faz 2 | 70 | Full export, CASCADE, billing webhook |
| Faz 3 | 82 | Purge cron, DPIA, KVKK, PII minimization |
| Faz 4 | 90+ | ROPA, breach playbook, verification sprint |

**Remaining for certified 90+:** Complete [verification-2026-07.md](./verification-2026-07.md) + [legal-review-tracker.md](./legal-review-tracker.md).
