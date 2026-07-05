# Sentry & Third-Party Post-Deletion Retention

Last updated: 2026-07-05 · Compliance Faz 4 (D8)

---

## Context

Account deletion removes data from Kaify's primary database (Supabase) and auth. **Third-party processors may retain scrubbed data** per their own retention schedules.

---

## Sentry

| Setting | Value |
|---------|-------|
| `sendDefaultPii` | **false** |
| `beforeSend` scrub | `lib/sentry/scrub.ts` |
| User ID in events | Hashed or omitted post-scrub |
| Retention | ~90 days (Sentry project setting) |

**After account delete:** Historical Sentry events may contain scrubbed stack traces tied to session context. They are not linked to an active Kaify account after auth deletion. Request Sentry data deletion via Sentry dashboard for specific users if DSAR requires (manual, case-by-case).

---

## Vercel

HTTP access logs may contain IP and URL paths for ~30 days. No chat body content in logs.

---

## Lemon Squeezy

Billing records retained by MoR per tax law (~7 years). Kaify `billing_events` uses `ON DELETE SET NULL` — see [deletion-behavior.md](./deletion-behavior.md).

---

## DSAR / erasure requests

When user requests erasure and third-party retention applies:

1. Complete Kaify-side delete (Settings or admin)
2. Document in DSAR ticket which vendors may retain
3. Submit vendor deletion requests if legally required and technically supported

Contact: privacy@kaifyai.org
