# Record of Processing Activities (ROPA)

Last updated: 2026-07-05 · Version **2026-07-05** · Compliance Faz 4

**Data controller:** Kaify Ai · Toros Mah., Çukurova, Adana 01150, Türkiye  
**Privacy contact:** privacy@kaifyai.org · **DPO (contact point):** privacy@kaifyai.org  
**Related:** [lawful-basis-register.md](./lawful-basis-register.md) · [retention-policy.md](./retention-policy.md) · [subprocessors.md](./subprocessors.md)

---

## 1. Processing activities

| ID | Activity | Data categories | Data subjects | Purpose | Lawful basis | Recipients | Retention | Security |
|----|----------|-----------------|---------------|---------|--------------|------------|-----------|----------|
| P1 | Account & authentication | Email, password hash, session | Users 16+ | Provide service | Contract Art. 6(1)(b) | Supabase Auth, Vercel | Until deletion | RLS, MFA optional |
| P2 | Profile & onboarding | Name, gender, height, weight, birth date, locale, bio | Users | Personalization | Contract | Supabase | Until deletion | RLS |
| P3 | AI coaching chat | Messages, coaching memory, usage metadata | Consenting users | Fitness coaching | **Consent Art. 9** | Google Gemini, DeepSeek, Supabase | 24 months | Consent gate, prompt redaction |
| P4 | Photo analysis | Body/food images (transient) | Consenting users | AI vision feedback | **Consent Art. 9** | Google Gemini | Not stored as images | Photo consent, no public bucket |
| P5 | Health metrics | Steps, daily analytics | Users | Progress tracking | Consent / contract | Supabase | 36 months | RLS |
| P6 | Gamification | Streaks, gems, Kai state, market inventory | Users | Engagement | Contract | Supabase | Until deletion | RLS, ledger append-only |
| P7 | Push notifications | Device tokens, preferences | Consenting users | Reminders | Consent | FCM, Web Push, Supabase | Until opt-out / deletion | Push consent required |
| P8 | In-app notifications | Notification content, read state | Users | UX / streak alerts | Contract | Supabase | 12 months | RLS |
| P9 | Subscriptions & billing | Tier, order IDs, billing email, webhook payload | Paying users | Payment & tier | Contract | Paddle, Supabase | 7 years (billing_events) | Signed webhook, no card storage |
| P10 | Referral program | Referral codes, events | Users | Growth | Legitimate interest / contract | Supabase | Until deletion | Abuse guards |
| P11 | Waitlist / marketing | Email, name, contact prefs | Prospects | Launch comms | Consent | Sender.net, reCAPTCHA | Until unsubscribe | reCAPTCHA disclosed |
| P12 | Cookie / analytics (optional) | Cookie consent choice | Web visitors | Product improvement | Consent | Vercel Analytics (if accepted) | Per vendor | Banner Accept/Reject |
| P13 | Security & abuse prevention | IP, user agent, rate limits, CSRF | All users | Security | Legitimate interest Art. 6(1)(f) | Supabase, Upstash, Vercel | 90 days – 24 months | Fail-closed rate limits |
| P14 | Error monitoring | Scrubbed stack traces | All users | Reliability | Legitimate interest | Sentry | ~90 days vendor | `sendDefaultPii: false`, scrub |
| P15 | Consent & compliance audit | Consent type, version, IP, UA | Users | Legal proof | Legal obligation | Supabase | Until deletion + export logs 24mo | Service-role insert |
| P16 | DSAR export | Full user JSON snapshot | Users | Art. 15 / KVKK m.11 | Legal obligation | None (self-service) | Export log 24 months | Rate limit, CSRF, MFA step-up |
| P17 | Account erasure | All P1–P16 user data | Users | Art. 17 / KVKK silme | Legal obligation | See [deletion-behavior.md](./deletion-behavior.md) | Immediate (except billing audit) | CASCADE + storage cleanup |

---

## 2. Special category data (GDPR Art. 9 / KVKK hassas veri)

| Data | Processing | Consent mechanism | Withdrawal |
|------|------------|-------------------|------------|
| Health-adjacent metrics (steps, injuries in chat) | P3, P5 | `ai_health` consent modal | Settings → Security |
| Body/food photos | P4 | `photo_analysis` consent | Settings → Security |
| AI inference on health context | P3 | `ai_health` + in-app disclaimer | Consent revoke |

DPIA: [dpia-ai-fitness.md](./dpia-ai-fitness.md)

---

## 3. International transfers

| Recipient | Location | Mechanism | Assessment |
|-----------|----------|-----------|------------|
| Supabase | EU (Frankfurt) | EU hosting | No third-country DB transfer |
| Google Gemini | US | SCC / Google DPA | [transfer-impact-assessment.md](./transfer-impact-assessment.md) |
| DeepSeek | CN / US API | SCC + supplementary measures | Legal review pending |
| Vercel, Sentry, Paddle, Sender.net | US / global | SCC | Vendor DPAs |

Cross-border signing checklist: [transfer-signing-checklist.md](./transfer-signing-checklist.md)

---

## 4. Data subject rights (implementation map)

| Right | GDPR | KVKK | How |
|-------|------|------|-----|
| Access / portability | Art. 15, 20 | m.11 | Settings → Security → JSON export |
| Erasure | Art. 17 | m.7 | Settings → Security → Delete account |
| Rectification | Art. 16 | m.11 | Profile / onboarding |
| Withdraw consent | Art. 7(3) | m.5 | AI + push revoke in Settings |
| Object (marketing) | Art. 21 | m.11 | Settings → marketing toggle |
| Restrict processing | Art. 18 | m.11 | Email privacy@kaifyai.org |
| Complaint | Art. 77 | m.14 | Supervisory authority |

DSAR manual process: [dsar-process.md](./dsar-process.md) · SLA **30 days**

---

## 5. Review cycle

| Review | Frequency | Owner | Last |
|--------|-----------|-------|------|
| ROPA update | On schema/vendor change | Engineering | 2026-07-05 |
| Lawful basis register | Quarterly | Privacy contact | 2026-07-05 |
| Subprocessor list | On vendor change + annual | Privacy contact | 2026-07-05 |
| Annual self-assessment | Yearly | Privacy contact | [annual-self-assessment-2026.md](./annual-self-assessment-2026.md) |

---

*Supersedes [ropa-draft.md](./ropa-draft.md).*
