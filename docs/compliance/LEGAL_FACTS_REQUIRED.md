# Legal Facts Required — unresolved items

**Last updated:** 2026-08-21  
**Status:** Open facts blocking counsel-ready publication. **No counsel sign-off recorded.**  
Engineering rewrite of Terms / Privacy / Cookies / Disclaimer is **pending counsel review**.

Do **not** invent registration numbers, tax IDs, DPO appointments, EU/UK reps, or signed DPAs. Fill this file only with verified facts.

---

| ID | Unresolved fact | Current published / code placeholder | Provisions / docs that depend on it | Owner | Status |
|----|-----------------|--------------------------------------|-------------------------------------|-------|--------|
| F1 | Formal registered legal entity name (vs display brand "Kaify Ai") | `LEGAL_ENTITY = "Kaify Ai"`; `LEGAL_ENTITY_STATUS` provisional | Terms §1, Privacy §1, ROPA header, all contracts | Founder + counsel | Open |
| F2 | Company registration number / trade registry ID | **Not published** (intentionally omitted) | Terms party clause, invoices if Kaify issues any, KVKK notices | Counsel | Open — do not invent |
| F3 | Tax / VAT ID if required on consumer-facing legal pages | Not published | Terms, invoices, Paddle seller profile alignment | Counsel / finance | Open |
| F4 | Registered office vs operational address | Operational only: Toros Mah., Çukurova, Adana 01150, Turkey | Terms §1, Privacy §1, KVKK aydınlatma | Counsel | Open |
| F5 | Whether a DPO must be appointed; if yes, identity and contact | Contact point uses privacy@kaifyai.org only | Privacy §1, ROPA, Art. 37 GDPR / KVKK | Counsel | Open |
| F6 | EU representative (Art. 27 GDPR) if required | Not appointed / not published | Privacy regional module, EEA users | Counsel | Open |
| F7 | UK representative (UK GDPR) if required | Not appointed / not published | Privacy UK module | Counsel | Open |
| F8 | Governing law confirmation | Provisional: Republic of Türkiye; venue Adana (non-exclusive) | Terms §20 | Counsel | Open |
| F9 | Liability cap / indemnity enforceability | Terms §18–19 marked legal review | Terms | Counsel | Open |
| F10 | Retention period confirmation (chat 24mo, health 36mo, consent 6y, billing 7y) | `retention-policy.md` + Privacy §11 | Privacy, ROPA, cron purge | Counsel + eng | Open — confirm before claiming compliance |
| F11 | DeepSeek DPA / SCC / transfer mechanism | Transfer checklist unsigned; Privacy §7/§10 | Privacy, DPIA, transfer-impact, Art. 46 | Counsel + vendor | Open — high risk |
| F12 | Gemini / Google Cloud DPA acceptance date | Checklist unsigned | Privacy AI section, transfers | Eng + counsel | Open |
| F13 | Sentry classification: essential / legitimate interest vs consent-gated | Cookies §6 treats as operational; no consent gate in code | Cookie Policy, ePrivacy, LEGAL_IMPLEMENTATION_CHECKLIST | Counsel | Open |
| F14 | VERBİS registration obligation for Kaify as veri sorumlusu | Tracker L10 pending | KVKK `/kvkk`, TR ops | TR counsel | Open |
| F15 | Whether WA My Health My Data / other US health laws require a published Consumer Health Data Notice | Template exists; applicability TBD | Privacy §6, consumer-health-data-notice.md | US counsel | Open |
| F16 | CCPA/CPRA “sale” / “share” / targeted advertising classification | Privacy: no sale claimed | Privacy §13, US state modules | Counsel | Open |
| F17 | Upstash region + DPA signed | Listed in Privacy §9 as operational | subprocessors, transfers | Eng | Open |
| F18 | Firebase / FCM / Web Push DPA and disclosure completeness | Push consent exists; subprocessors updated 2026-08-21 | Privacy, push consent | Eng + counsel | Open |
| F19 | Termly: confirm env embed remains optional / non-canonical | `PRIVACY_TERMLY_DATA_ID`; Cookies §5 | Privacy hosting, cookies | Eng | Confirmed engineering position; counsel N/A |
| F20 | Paddle seller entity mapping (which Paddle group company) | Generic MoR language in Terms §12 | Terms, tax, consumer notices | Counsel + Paddle | Open |
| F21 | Statutory withdrawal / cooling-off digital-content wording adequacy | Terms §14 defers to Paddle + mandatory law | Terms, EU consumer | Counsel | Open |
| F22 | Price-change notice + consent workflow (ops + Paddle Billing) | Terms §15; disclosures copy | Terms, PADDLE checklist | Eng + counsel | Open — process not fully automated |
| F23 | Guardian authorization verification for users 16–17 | Representational only in Terms §2 | Terms, Privacy §14, UK Age Appropriate Design | Counsel + product | Open |
| F24 | Local-language mandatory notice requirements beyond EN primary | EN controlling; TR KVKK module exists | Privacy §16, Terms §21 | Counsel | Open |
| F25 | Breach notification authority contacts for TR / EU / UK | breach-playbook exists; contacts TBD | Breach playbook | Counsel | Open |

---

## How to close a fact

1. Obtain written confirmation from qualified counsel or vendor contract evidence.
2. Update `lib/legal/constants.ts` and/or the relevant policy document versions if user-facing.
3. Mark this row **Closed** with date and evidence link (no fabricated signatures).
4. Update [legal-review-tracker.md](./legal-review-tracker.md) only when counsel actually reviews.

Contact: privacy@kaifyai.org
