# Legal Changelog — August 2026 rewrite

**Audience:** Engineering + counsel  
**Not legal advice. No counsel approval implied.**

---

## 2026-08-21 — Legal rewrite v2 (engineering)

### Terms of Service → **v2.0.0**

Material themes in the in-repo Terms (`lib/legal/documents/terms.ts`):

- Contracting party display **Kaify Ai**; operational address Toros Mah., Çukurova, Adana 01150, Turkey; formal entity/registration marked for counsel.
- Individual founder/officer protection language; claims against operating entity.
- **16+** eligibility; 16–17 guardian authorization representations.
- Service description: AI coaches **Alex, Maya, Leo, Kai**; no outcome guarantees.
- Expanded medical / physical-activity disclaimer; emergency services not via Kaify.
- AI section: **Gemini** (vision-related) + **DeepSeek** (conversational); outputs not medical advice.
- Acceptable use, IP, user-content license clarified.
- **Paddle MoR** dual-relationship; links to Buyer Terms, Refund Policy, Privacy Notice.
- Subscriptions, portal cancel, account **delete ≠ cancel ≠ refund**.
- Refunds / withdrawal rights framed via Paddle + mandatory law.
- Price-change notice / consent requirements; catalog price ≠ auto update.
- Liability + indemnity marked for legal review; provisional governing law **Türkiye** / venue **Adana** (non-exclusive), counsel confirmation required.
- English controlling; no global class-action waiver / US-style arbitration in base Terms.

### Privacy Policy → **2026-08-21**

- Global English **primary** (not KVKK-only); `/kvkk` as regional module.
- Controller vs **Paddle** payment privacy role split.
- Categories: account, age, health/fitness, photos, AI, device, analytics, Paddle identifiers (no full PAN).
- Purposes/bases including Art. 9-style consent for health/AI/photo.
- Explicit **non-HIPAA**; US consumer health laws flagged via matrix / optional notice.
- Subprocessors: Supabase, Vercel, Gemini, DeepSeek, Sentry, Paddle, reCAPTCHA, Sender.net, **Upstash**, **FCM / Web Push**.
- Transfers; retention summary; rights; 16–17 high-privacy defaults; deletion vs cancel.

### Cookie Policy → **2026-08-21**

- Essential vs functional vs optional analytics; marketing/reCAPTCHA notes.
- **Termly** optional / not canonical.
- Sentry described as operational pending counsel classification.
- GPC stated as to-be-honored where required (implementation tracked separately).

### Medical & Fitness Disclaimer → **2026-08-21**

- Standalone short-form: not medical care; inherent risks; when to stop; AI may be wrong; professional advice; links to Terms.

### Code constants

```text
TERMS_VERSION = "2.0.0"
PRIVACY_VERSION = "2026-08-21"
COOKIES_VERSION = "2026-08-21"
MEDICAL_DISCLAIMER_VERSION = "2026-08-21"
LEGAL_ENTITY = "Kaify Ai"
```

### Compliance pack added/updated same day

- `LEGAL_AUDIT.md`, `LEGAL_FACTS_REQUIRED.md`, `PRIVACY_LAW_MATRIX.md`
- `PADDLE_COMPLIANCE_CHECKLIST.md`, `LEGAL_IMPLEMENTATION_CHECKLIST.md`
- `consumer-health-data-notice.md` (template)
- Updates: `subprocessors.md`, `legal-review-tracker.md`, `policy-changelog.md`

---

## Prior baseline (for comparison)

| Date | Doc | Version |
|------|-----|---------|
| 2026-07-05 | Privacy / Cookies / KVKK / ROPA | 2026-07-05 |
| 2026-07-05 | Terms | 1.0.0 |

---

**Next:** Counsel review per [legal-review-tracker.md](./legal-review-tracker.md). Do not claim legal approval until signed off.
