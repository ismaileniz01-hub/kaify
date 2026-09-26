# Privacy Law Matrix — Kaify Ai

**Last updated:** 2026-08-21  
**Not legal advice.** Engineering assessment of which regimes **likely apply** vs **likely do not**, based on: global English-primary fitness app, Turkey operational address, 16+, AI health-adjacent data, Paddle MoR payments, users potentially worldwide.

Controller display: **Kaify Ai** · privacy@kaifyai.org · support@kaifyai.org

---

## Summary

| Regime | Likely apply? | Why (product facts) | Module / action |
|--------|---------------|---------------------|-----------------|
| **GDPR (EEA)** | Likely **yes** if offering to EEA residents | Online service available globally; health-adjacent data; AI processors | Privacy Policy Art. 6/9 bases; consent gates; DSAR; transfers; DPIA |
| **UK GDPR + DPA 2018** | Likely **yes** if UK users | Same product; UK Children’s Code risk for 16–17 | Privacy UK rights; Age Appropriate Design review |
| **ePrivacy / PECR (cookies)** | Likely **yes** for EU/UK web | Cookie banner + optional analytics | Cookie Policy; Accept / Reject; GPC TODO |
| **KVKK (Turkey)** | Likely **yes** | Operational address Turkey; TR users; `/kvkk` module | KVKK aydınlatma; VERBİS TBD (F14) |
| **CCPA / CPRA (California)** | Possible if CA “business” thresholds met | Fitness + account data; claim no “sale” | Privacy US rights; verify thresholds with counsel |
| **Other US state privacy (VCDPA, CPA, CTDPA, etc.)** | Possible by user location | Global availability | Privacy §13 generic US rights; counsel map |
| **WA My Health My Data Act (MHMDA)** | Possible if WA consumers + “consumer health data” | Meal/physique/health logs, AI coaching | See [consumer-health-data-notice.md](./consumer-health-data-notice.md); counsel decides publish |
| **Other US consumer health laws (NV, CT, etc.)** | Possible | Same health-adjacent processing | Counsel matrix; do not claim HIPAA |
| **HIPAA** | Likely **no** (as designed) | Not a covered entity / not claiming clinical care | Privacy §6 explicit non-HIPAA |
| **COPPA (under 13)** | Likely **no** if 16+ enforced | Minimum age 16 | Age gate; delete under-16; still review 16–17 youth rules |
| **LGPD (Brazil)** | Possible if BR users targeted/available | Global app | Rights on request; local notice TBD |
| **PIPEDA / Canadian provincial** | Possible | Global app | Counsel if CA marketing expands |
| **Australian Privacy Act** | Possible | Global app | Counsel if AU user volume material |
| **Paddle payment laws / MoR tax** | Yes for **transactions** | Paddle is MoR | Separate from Kaify Privacy role; link Buyer Terms |

---

## Module checklist

### A. GDPR / UK GDPR

| Topic | Product status | Gap |
|-------|----------------|-----|
| Controller identity | Display name + operational address | Formal entity / reg # / DPO / Art. 27 (F1–F7) |
| Lawful bases | Contract, consent, LI, legal obligation in Privacy | Counsel confirm Art. 9 path |
| Special category (health) | AI health + photo consents | Withdrawal UX exists; text counsel review |
| International transfers | Gemini US; DeepSeek CN/US; others | DeepSeek high risk (F11) |
| DPIA | `dpia-ai-fitness.md` | Counsel review |
| Rights / DSAR | Export + delete + email | 30-day SLA documented |
| Breach | `breach-playbook.md` | Authority contacts TBD |

### B. Turkey KVKK

| Topic | Product status | Gap |
|-------|----------------|-----|
| Aydınlatma | `/kvkk` page | Align with 2026-08-21 EN Privacy |
| Veri sorumlusu | Kaify Ai display | Formal entity + VERBİS (F14) |
| Hassas veri | Health-adjacent | Explicit consent UX |

### C. Cookies / ePrivacy

| Topic | Product status | Gap |
|-------|----------------|-----|
| Banner Accept / Reject optional | Implemented | “Reject All” parity / Manage prefs UX |
| Non-essential gated | Vercel Analytics gated | GPC not coded |
| Sentry | Loads without cookie accept | Counsel classification (F13) |

### D. US state + consumer health

| Topic | Product status | Gap |
|-------|----------------|-----|
| “Do not sell” posture | Privacy: no sale of health data | Confirm share/targeted ads |
| WA MHMDA notice | Template only | Publish only if counsel says apply |
| Appeals / authorized agents | Privacy mentions | Process detail TBD |

### E. Youth (16–17)

| Topic | Product status | Gap |
|-------|----------------|-----|
| Minimum age 16 | Terms + tests | Not adults-only |
| High-privacy defaults | Stated in Privacy §14 | UK Children’s Code audit TBD |
| Guardian authorization | Representational | Verification TBD (F23) |

### F. Payments (not privacy-law identity, but linked)

| Topic | Product status | Gap |
|-------|----------------|-----|
| MoR separation | Terms §12 clear | Keep Kaify ≠ Paddle roles |
| Refunds / withdrawal | Via Paddle policy | Webhook gap for refunds |

---

## Explicit non-claims

- Kaify does **not** claim HIPAA compliance.
- Kaify does **not** claim all US state health laws are inapplicable — applicability is counsel-dependent.
- English primary does **not** waive mandatory local-language notices where required.

Contact: privacy@kaifyai.org
