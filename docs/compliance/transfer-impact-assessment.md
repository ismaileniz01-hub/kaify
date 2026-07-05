# Transfer Impact Assessment (Compliance Faz 3)

Last updated: 2026-07-05 · **Draft**

## Transfers outside EEA/Turkey

| Provider | Location | Data transferred | Mechanism |
|----------|----------|------------------|-----------|
| **Google (Gemini)** | US | Prompts, images (transient) | SCC (Google Cloud DPA) |
| **DeepSeek** | CN / US API | Text prompts | SCC or supplementary measures — **legal review required** |
| **Vercel** | Global edge | HTTP logs | SCC |
| **Sentry** | EU/US | Scrubbed stack traces | SCC, `sendDefaultPii: false` |
| **Lemon Squeezy** | US | Billing email, order metadata | SCC / MoR DPA |
| **Sender.net** | US | Waitlist email | Consent + SCC |
| **Supabase** | EU (Frankfurt) | Primary database | EU hosting — no third-country transfer for DB |

## DeepSeek — supplementary measures

- Prompt sanitization and PII redaction before API calls
- No persistent storage of raw prompts in DeepSeek-facing logs on Kaify side beyond `ai_usage_ledger` metadata
- User explicit AI consent (Art. 9)
- Monitor regulatory guidance on CN transfers

## Actions

1. Sign/accept vendor DPAs in each dashboard
2. Document SCC references in enterprise DPA template
3. **Avukat review** for DeepSeek CN routing

Contact: privacy@kaifyai.org
