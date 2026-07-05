# Kaify Subprocessors (Compliance Faz 1)

Last updated: 2026-07-05

| Processor | Purpose | Location | Data processed |
|-----------|---------|----------|----------------|
| **Supabase** | Database, auth, storage | EU (Frankfurt) | Account, health, chat, analytics |
| **Vercel** | Hosting, edge | Global | HTTP logs, deployment |
| **Google (Gemini)** | AI vision & text | US | Prompts, images (transient) |
| **DeepSeek** | AI text synthesis | CN/US API | Prompts (no raw image storage) |
| **Sentry** | Error monitoring | EU/US | Stack traces, scrubbed context |
| **Lemon Squeezy** | Payments (MoR) | US | Billing email, subscription status |
| **Google reCAPTCHA** | Bot protection | US | IP, interaction signals |
| **Sender.net** | Email marketing (waitlist) | US | Email, preferences |
| **Termly** | Policy hosting/embed | US | Page views on legal pages |

Updates to this list will be reflected in the Privacy Policy. Data Processing Agreements
should be signed in vendor dashboards where available.

**Change process:** [subprocessor-change-process.md](./subprocessor-change-process.md)  
**DPA signing tracker:** [transfer-signing-checklist.md](./transfer-signing-checklist.md)

Contact: privacy@kaifyai.org
