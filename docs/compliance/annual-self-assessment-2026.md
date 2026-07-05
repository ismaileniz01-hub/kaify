# Annual Compliance Self-Assessment — 2026

Last updated: 2026-07-05 · Compliance Faz 4  
**Reviewer:** privacy@kaifyai.org · **Next review:** 2027-07-05

Score each **1–5** (1=gap, 5=strong). Target average **≥4.0** for 90+ posture.

---

## A. Transparency & policies

| # | Control | Score | Evidence | Notes |
|---|---------|-------|----------|-------|
| A1 | Privacy policy current | | `/privacy` | |
| A2 | Terms current | | `/terms` | |
| A3 | KVKK aydınlatma | | `/kvkk` | |
| A4 | Cookie policy + banner | | `/cookies` | |
| A5 | Subprocessor list current | | subprocessors.md | |
| A6 | Policy changelog maintained | | policy-changelog.md | |

## B. Lawful basis & consent

| # | Control | Score | Evidence | Notes |
|---|---------|-------|----------|-------|
| B1 | AI Art. 9 consent + DB log | | consent_records | |
| B2 | Photo consent separate | | photo_analysis | |
| B3 | Push consent | | push_notifications | |
| B4 | Consent withdraw works | | Settings → Security | |
| B5 | Lawful basis register | | lawful-basis-register.md | |

## C. Data subject rights

| # | Control | Score | Evidence | Notes |
|---|---------|-------|----------|-------|
| C1 | Export completeness | | export-completeness test | |
| C2 | Delete CASCADE verified | | deletion-completeness test | |
| C3 | DSAR 30-day SLA | | dsar-process.md | |
| C4 | Age 16+ enforced | | onboarding birth_date | |

## D. Security & privacy by design

| # | Control | Score | Evidence | Notes |
|---|---------|-------|----------|-------|
| D1 | RLS on user tables | | Supabase advisors | |
| D2 | PII redaction in AI prompts | | prompt-safety | |
| D3 | Sentry scrubbing | | lib/sentry/scrub.ts | |
| D4 | Retention purge active | | retention_purge_runs | |

## E. Transfers & vendors

| # | Control | Score | Evidence | Notes |
|---|---------|-------|----------|-------|
| E1 | Transfer impact assessment | | transfer-impact-assessment.md | |
| E2 | Vendor DPAs signed | | transfer-signing-checklist.md | |
| E3 | Subprocessor change process | | subprocessor-change-process.md | |

## F. Governance & incidents

| # | Control | Score | Evidence | Notes |
|---|---------|-------|----------|-------|
| F1 | ROPA complete | | ropa.md | |
| F2 | DPIA for AI fitness | | dpia-ai-fitness.md | |
| F3 | Breach playbook | | breach-playbook.md | |
| F4 | Tabletop within 12 months | | breach-tabletop-2026-07.md | |
| F5 | Legal review | | legal-review-tracker.md | |

---

## Summary

| Section | Avg score | Target |
|---------|-----------|--------|
| A | | ≥4 |
| B | | ≥4 |
| C | | ≥4 |
| D | | ≥4 |
| E | | ≥3.5 |
| F | | ≥3.5 |
| **Overall** | | **≥4.0** |

## Action items

| Priority | Item | Owner | Due |
|----------|------|-------|-----|
| | | | |

Signed: __________ Date: __________
