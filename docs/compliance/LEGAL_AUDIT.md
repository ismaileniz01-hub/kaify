# Legal Audit — Kaify Ai (engineering rewrite 2026-08-21)

**Status:** Engineering inventory only. **Not legal advice. No counsel sign-off.**  
**Entity display name:** Kaify Ai · **Address published:** Toros Mah., Çukurova, Adana 01150, Turkey  
**Contacts:** privacy@kaifyai.org · support@kaifyai.org  
**Product facts:** English primary · 16+ · Paddle MoR · coaches Alex / Maya / Leo / Kai · DeepSeek + Gemini · Supabase · Vercel · Sentry · Upstash · FCM / Web Push · Sender.net · reCAPTCHA  

Related: [LEGAL_FACTS_REQUIRED.md](./LEGAL_FACTS_REQUIRED.md) · [PRIVACY_LAW_MATRIX.md](./PRIVACY_LAW_MATRIX.md) · [subprocessors.md](./subprocessors.md) · [ropa.md](./ropa.md)

---

| Activity or data | Repository evidence | Purpose | Legal role | Legal basis | Recipient/provider | Country/region | Retention | User control | Required document | Risk/TODO |
|------------------|---------------------|---------|------------|-------------|--------------------|----------------|-----------|--------------|-------------------|-----------|
| Account / auth (email, OTP, sessions) | `profiles`, Supabase Auth; Terms §7; Privacy §3 | Provide service, sign-in | Kaify controller | Contract (Art. 6(1)(b) analogue) | Supabase, Vercel | EU (Frankfurt DB claim); edge global | Until account deletion | Export / delete in Settings | Privacy, Terms | Confirm registered entity name; no invented registration # |
| Age / birth date (16+) | Onboarding + `tests/compliance/age.test.ts`; Terms §2 | Eligibility gate | Controller | Contract / legal obligation (age gate) | Supabase | EU / Turkey ops | Until deletion | Correct profile; under-16 delete | Terms, Privacy §14 | Guardian verification process incomplete for 16–17 |
| Profile & goals (height, weight, sex, goals) | Onboarding / `user_settings`; Privacy §3 | Personalize coaching | Controller | Contract; health-adjacent may need Art. 9 consent | Supabase | EU | Until deletion | Edit profile | Privacy, AI health consent | Confirm Art. 9 coverage for all fields |
| Health / fitness logs (workouts, meals, water, steps) | Health tables, analytics; ROPA P5; Privacy §6 | Progress & coaching | Controller | Consent (Art. 9) / contract | Supabase | EU | ~36 months metrics (retention-policy) | Edit logs; withdraw AI health consent; delete | Privacy, Medical Disclaimer, DPIA | Confirm retention periods with counsel |
| AI chat / coaching memory (Alex, Maya, Leo, Kai) | Chat + `coaching_memory`; Privacy §7; Terms §6 | Fitness coaching | Controller; providers processors | Explicit consent (Art. 9) where required | DeepSeek, Gemini, Supabase | CN/US routes (DeepSeek); US (Gemini); EU DB | Chat/memory ~24 months | Consent revoke in Settings; delete | Privacy, Art. 9 consent UI, DPIA | DeepSeek DPA/SCC pending |
| Meal / physique photos | Photo analysis flows; Privacy §3/§7; consent `photo_analysis` | Vision analysis | Controller | Explicit consent | Google Gemini | US | Images processed per product design (not public bucket) | Photo consent withdraw | Privacy, photo consent, Cookies N/A | Confirm storage duration vs transient claim |
| Paddle subscription / entitlements | Billing domain, webhooks; Terms §12–15; Privacy §1/§9 | Paid access | Paddle MoR independent controller for payments; Kaify controller for entitlements | Contract; tax/accounting obligation | Paddle | US / UK | Billing events ~7 years (user_id nulled on delete) | Manage billing portal; cancel; delete | Terms, Paddle Buyer Terms / Refund / Privacy | No refund webhook handler — see PADDLE checklist |
| Card / full payment data | Explicitly not stored; Terms §12 | N/A (Kaify) | Paddle controller | Paddle policies | Paddle | US / UK | Per Paddle | Via Paddle | Paddle Privacy | Do not claim PCI scope for Kaify |
| Cookies / localStorage consent | `CookieConsentBanner`, `cookie-consent.ts`; Cookies Policy | Preference for optional analytics | Controller | Consent (ePrivacy) for non-essential | First-party; Vercel Analytics if accepted | Browser / Vercel | Consent record until cleared / version bump | Accept / Reject optional; clear `kaify_cookie_consent` | Cookie Policy | GPC not implemented; Reject All parity TODO |
| Optional web analytics | `OptionalAnalytics`; Cookies §4 | Product/performance metrics | Controller | Consent | Vercel Analytics / Speed Insights | Global | Per Vercel | Reject optional cookies | Cookie Policy, Privacy | Skipped on native shell |
| Sentry error monitoring | `lib/sentry/options.ts` (`sendDefaultPii: false`); Cookies §6 | Reliability / security | Controller; Sentry processor | Legitimate interest (provisional) | Sentry | EU/US | ~90 days (sentry-retention) | Limited; account delete scrub path | Privacy, Cookies | Counsel: essential vs consent-gated |
| Rate limit / cache | Upstash usage; ROPA P13 | Abuse prevention | Controller | Legitimate interest | Upstash | Vendor regions | Short TTL / 90d–24mo security logs | N/A operational | Privacy, subprocessors | Confirm Upstash region + DPA signed |
| Push (FCM / Web Push) | `push.service.ts`; consent `push_notifications` | Reminders | Controller | Consent | Firebase / FCM, Web Push, Supabase | US / global | Until opt-out / deletion | Push consent revoke | Privacy | Disclose native SDK vs cookies |
| Waitlist / marketing email | Sender.net; reCAPTCHA on forms; Privacy §9 | Launch / marketing | Controller | Consent | Sender.net, Google reCAPTCHA | US | Until unsubscribe | Unsubscribe / reject marketing path | Privacy, Cookies | Marketing only if consented |
| Bot protection (reCAPTCHA) | Waitlist forms; Cookies §5 | Abuse prevention | Controller; Google processor/controller mix | Legitimate interest / necessity for form | Google | US | Per Google | Use form implies processing | Privacy, Cookies | Disclose third-party cookies |
| Support communications | Email to support@ / privacy@ | Support & DSAR | Controller | Contract / legal obligation | Email provider (ops) | Turkey / vendor | Per retention / legal hold | Email privacy@ | Privacy, DSAR process | Formal DPO appointment TBD |
| Consent evidence | `consent_records`, `consent_revocations` | Proof of consent | Controller | Legal obligation | Supabase | EU | Targeted multi-year (~6 years schedule) | N/A (compliance) | Privacy §11, retention-policy | Confirm period with counsel |
| DSAR export | Settings export; `data_export_logs` | Access / portability | Controller | Legal obligation | None (self-service) | EU | Export log ~24 months | Self-serve + email | Privacy §13, dsar-process | SLA 30 days |
| Account deletion vs cancel | Deletion behavior docs; Privacy §15; Terms §13 | Erasure / stop renewal | Controller + Paddle cancel API | Legal obligation / contract | Paddle, Supabase | Global | Cascade delete; billing audit retained anonymized | Settings delete vs Manage billing | Privacy, Terms, deletion-behavior | Deletion ≠ refund |
| Termly embed (optional) | `PRIVACY_TERMLY_DATA_ID` env; Cookies §5 | Optional policy embed | Not canonical controller text | N/A if disabled | Termly | US | Page views if enabled | Prefer in-repo `/privacy` | Privacy (in-repo canonical) | Keep optional; do not treat as source of truth |
| Medical / fitness disclaimer content | `/disclaimer`; Medical Disclaimer doc; Terms §5 | Risk disclosure | Controller (publisher) | Transparency / liability framing | N/A | Global | Versioned with policy | Acknowledge via Terms | Medical Disclaimer, Terms | Counsel review liability §§ |
| Governing law / venue (provisional) | Terms §20; `GOVERNING_LAW_PROVISIONAL` | Contract disputes | Contracting entity | Contract (provisional TR / Adana) | N/A | Turkey provisional | N/A | Consumer mandatory forums preserved | Terms | **Counsel must confirm** — see LEGAL_FACTS_REQUIRED |

---

## Notes

1. Do **not** invent company registration numbers, tax IDs, or counsel approvals in public copy.
2. English is the primary legal language; `/kvkk` is a Turkish regional module, not a replacement for the global Privacy Policy.
3. Update this table when subprocessors, retention, or consent UX change.
