# DPIA — AI Fitness & Health Processing (Compliance Faz 3)

Last updated: 2026-07-05 · **Draft for internal review**

## 1. Processing description

Kaify uses third-party LLMs (Google Gemini, DeepSeek) to provide AI coaching, meal/workout suggestions, and optional body/food photo analysis. Users may enter health-adjacent data (weight, injuries, steps, photos).

## 2. Necessity & proportionality

| Question | Assessment |
|----------|------------|
| Is AI necessary? | Core product value; alternatives (static plans) reduce personalization |
| Can we minimize data? | Yes — PII redaction in prompts, no public photo storage, memory condensation |
| Retention | Chat/memory 24 months; automated purge cron |

## 3. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Wrong AI advice | Medium | High | Disclaimers, not medical advice, human coaches |
| Prompt injection | Medium | Medium | sanitizeUserText, canary, injection scoring |
| Provider breach | Low | High | Subprocessor DPAs, minimal data sent |
| Special category misuse | Low | High | Explicit Art. 9 consent, withdraw in Settings |

## 4. Data subjects' rights

Export, delete, withdraw AI consent, object to marketing — implemented in app.

## 5. Decision

Processing may continue with existing controls. **Legal review recommended** before claiming full DPIA sign-off.

Contact: privacy@kaifyai.org
