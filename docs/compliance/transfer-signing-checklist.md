# Cross-Border Transfer Signing Checklist

Last updated: 2026-07-05 · Compliance Faz 4  
Related: [transfer-impact-assessment.md](./transfer-impact-assessment.md)

---

## Vendor DPA / SCC acceptance

| Vendor | DPA location | SCC mechanism | Signed? | Date | Notes |
|--------|--------------|---------------|---------|------|-------|
| **Supabase** | Dashboard → Organization → Legal | EU hosting + DPA | ☐ | | Primary DB in Frankfurt |
| **Vercel** | Account → Legal | SCC (DPA) | ☐ | | |
| **Google Cloud (Gemini)** | Google Cloud Console | Google DPA + SCC | ☐ | | |
| **DeepSeek** | API provider terms | **Legal review required** | ☐ | | CN routing risk |
| **Sentry** | sentry.io settings | DPA + SCC | ☐ | | EU region preferred |
| **Lemon Squeezy** | Seller dashboard → Legal | MoR DPA | ☐ | | |
| **Sender.net** | Account legal | SCC | ☐ | | Waitlist only |
| **Upstash** | Console → Legal | SCC | ☐ | | Rate limiting |

---

## Internal actions

- [ ] Document signed date in this file when each DPA accepted
- [ ] Add new vendors to [subprocessors.md](./subprocessors.md) within 30 days
- [ ] Notify users via Privacy Policy update if subprocessor added (see [subprocessor-change-process.md](./subprocessor-change-process.md))
- [ ] DeepSeek: counsel sign-off on CN transfer or disable route for EU users (if advised)

---

## Enterprise customer requests

Provide on request:
- [dpa-template.md](./dpa-template.md)
- Current [subprocessors.md](./subprocessors.md)
- [transfer-impact-assessment.md](./transfer-impact-assessment.md)

Contact: privacy@kaifyai.org
