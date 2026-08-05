# Faz 4 — Security & reliability evidence

Date: 2026-08-05  
Scope: Product Quality Audit path-to-90+ Faz 4 (HIBP · step-up · getUser · Sentry scrub · soft retry)

## Code shipped

| Item | Status | Notes |
|------|--------|-------|
| Sensitive step-up (delete/export) | Done | MFA AAL2 if enrolled; else OTP cookie `kaify_stepup` or fresh login ≤10m |
| Billing portal `sensitiveAction` | Done | `POST /api/billing/portal` |
| Client `getUser()` | Done | MfaGate, MFA page, consent/referral gates |
| Sentry scrub deepen | Done | user hash, breadcrumbs, extras, request data; unit tests |
| `apiFetch` soft retry | Done | GET: 503/network ×2; mutating: network-only ×1 |

## Operator: HIBP

Supabase **Pro** feature (Have I Been Pwned leaked-password protection).

- [ ] Run `node scripts/ops/enable-hibp.mjs` with `SUPABASE_ACCESS_TOKEN`, **or** enable in Supabase Dashboard → Auth → Email → Prevent use of leaked passwords
- [ ] Confirm response / dashboard shows `password_hibp_enabled: true`

**2026-08-05 waiver:** Operator cannot enable HIBP on current plan (paid / Pro-only).  
Accepted risk: Auth is **OTP-first**; password enrollment is uncommon. Revisit when Pro is active.  
Status: **deferred — not a Faz 4/6 code blocker**

Confirmation: _deferred — plan cost_

## Related routes

- `POST /api/auth/step-up/send`
- `POST /api/auth/step-up/verify`
- `DELETE /api/profile` (`sensitiveAction`)
- `GET /api/profile/export` (`sensitiveAction`)
