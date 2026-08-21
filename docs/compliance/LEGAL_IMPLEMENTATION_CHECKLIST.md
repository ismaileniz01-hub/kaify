# Legal Implementation Checklist — UX & engineering

**Last updated:** 2026-08-21  
Tracks product implementation against the August 2026 legal rewrite.  
**Not legal advice. No counsel sign-off.**

Versions in code (`lib/legal/constants.ts`):

- Terms **2.0.0**
- Privacy / Cookies / Medical Disclaimer **2026-08-21**

---

## Done (engineering)

| ID | Item | Evidence |
|----|------|----------|
| D1 | In-repo Privacy / Terms / Cookies / Disclaimer documents (EN primary) | `lib/legal/documents/*`; marketing pages |
| D2 | Age gate 16+ | Terms §2; compliance age tests |
| D3 | AI health consent + photo analysis consent types | `CONSENT_TYPES`; consent gates |
| D4 | Push notification consent type | `push_notifications` |
| D5 | Cookie banner Accept + Reject optional (not pre-ticked) | `CookieConsentBanner.tsx`; `cookie-consent.ts` |
| D6 | Optional Vercel Analytics gated on accept | `OptionalAnalytics.tsx` |
| D7 | Cookie banner skipped on native app shell | `useNativeApp` guard |
| D8 | Paddle MoR + Buyer Terms / Refund / Privacy links in Terms | Terms §12; constants |
| D9 | Short subscription disclosures EN/TR | `subscription-disclosures.ts` |
| D10 | Account delete cancels live Paddle subs then deletes | deletion behavior + unit test |
| D11 | DSAR JSON export + account delete in Settings | ROPA / dsar-process |
| D12 | Retention purge cron documented | `retention-policy.md` |
| D13 | Sentry `sendDefaultPii: false` + scrub posture | `lib/sentry/options.ts` |
| D14 | Subprocessors list includes AI, Paddle, reCAPTCHA, Sender | `subprocessors.md` (updated 2026-08-21) |
| D15 | Termly treated as optional / non-canonical | constants + Cookies §5 |
| D16 | Medical & Fitness Disclaimer page | `/disclaimer` |
| D17 | KVKK regional page exists | `/kvkk` |
| D18 | Coaches named consistently (Alex, Maya, Leo, Kai) | Terms §4 |
| D19 | AI providers named (Gemini vision; DeepSeek conversational) | Terms §6; Privacy §7 |

---

## TODO / partial

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| T1 | **Reject All parity** | Medium | Banner label is “Reject optional” / Accept (not symmetric “Accept All” / “Reject All”). Cookie Policy mentions Accept All / Reject optional. Align copy + ensure Reject disables all non-essential equally. |
| T2 | **Manage cookie preferences** UI | Medium | Policy mentions Manage preferences “where offered”; banner is binary only. Add preferences link or settings control. |
| T3 | **Global Privacy Control (GPC)** | High (where required) | Policy says GPC will be honored; **no `navigator.globalPrivacyControl` / Sec-GPC implementation found**. Auto-set rejected/non-essential off when GPC present. |
| T4 | **Sentry consent gating** | High pending counsel | Cookies §6: if counsel classifies non-essential, gate client Sentry init behind analytics/ops consent. Until then document LI rationale. |
| T5 | **Consumer health data notice (WA / US)** | Counsel-gated | Template: [consumer-health-data-notice.md](./consumer-health-data-notice.md). Publish + link from Privacy only if counsel says MHMDA/etc. applies. |
| T6 | **Refund / adjustment webhooks** | High | See [PADDLE_COMPLIANCE_CHECKLIST.md](./PADDLE_COMPLIANCE_CHECKLIST.md) — no refund webhook today. |
| T7 | **Price-change notice + consent ops** | Medium | Terms §15 requires process beyond copy. |
| T8 | **Re-consent prompt** for Terms/Privacy version bump | Medium | Version constants bumped; verify `requireTermsConsent` / pending legal consent for existing users. |
| T9 | **Guardian verification** for 16–17 | Low/Medium | Representational only. |
| T10 | **Formal entity / address / emails in all locales** | Medium | Display Kaify Ai; privacy@ / support@; do not invent reg #. |
| T11 | **VERBİS / KVKK alignment** after EN rewrite | Medium | Sync `/kvkk` with Privacy 2026-08-21. |
| T12 | **DeepSeek transfer controls** | High | Counsel; optional geo restrict. |
| T13 | **Upstash + FCM** DPA signing + region note | Medium | Listed in subprocessors; complete transfer checklist. |
| T14 | **Cookie preferences re-open control** in footer/settings | Low | Clearing `kaify_cookie_consent` works but is not user-friendly. |
| T15 | **Support playbook**: delete vs cancel vs refund | Medium | Avoid promising refunds on delete. |

---

## Counsel-dependent (do not mark Done without review)

| ID | Topic | Tracker |
|----|-------|---------|
| C1 | Privacy / Terms / Cookies / Disclaimer legal review | [legal-review-tracker.md](./legal-review-tracker.md) L1–L7 |
| C2 | Art. 9 AI health + photo consent text | L4, L5 |
| C3 | DeepSeek CN transfer | L8 |
| C4 | VERBİS | L10 |
| C5 | Sentry classification | F13 in LEGAL_FACTS_REQUIRED |
| C6 | WA MHMDA applicability | F15 |

---

Contact: privacy@kaifyai.org
