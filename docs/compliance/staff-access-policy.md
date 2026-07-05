# Staff Access Policy (Solo Developer)

Last updated: 2026-07-05 · Compliance Faz 4 (L6)

---

## Scope

Kaify Ai operates with a **small team / solo developer** model. This policy defines who can access production personal data and under what conditions.

---

## Access tiers

| Tier | Systems | Who | MFA |
|------|---------|-----|-----|
| **Production DB** | Supabase dashboard, service role | Founder / lead engineer only | Required |
| **Auth admin** | Supabase Auth, user delete | Same | Required |
| **Deploy** | Vercel, env secrets | Same | Required |
| **Support** | privacy@ inbox, DSAR exports | Privacy contact | Required |
| **Analytics** | Sentry, Vercel logs | Engineering | Required |

---

## Rules

1. **No shared passwords** — individual accounts only
2. **Service role key** — server-side only, never in client or public repos
3. **Production data access** — minimum necessary; prefer anonymized staging
4. **DSAR manual exports** — log in ticket + `data_export_logs` when using service role
5. **Offboarding** — revoke Supabase/Vercel access same day (when team grows)
6. **Contractors** — NDA + time-limited access + audit log review

---

## Review

Annual review with [annual-self-assessment-2026.md](./annual-self-assessment-2026.md).

Contact: privacy@kaifyai.org
