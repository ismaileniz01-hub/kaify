# Kaify Security Architecture

Last updated: 2026-08-04

## Threat model (summary)

| Asset | Primary threats | Controls |
|-------|-----------------|----------|
| User accounts | Session hijack, MFA bypass | Supabase Auth, MFA AAL2, fail-closed guards |
| Health / chat data | LLM exfiltration, injection | Prompt sanitization, canary, soft-block, RLS |
| Gems / economy | RPC bypass, farming | Service-role RPCs + Faz 0 GRANT lockdown, idempotency, rate limits |
| Avatars | IDOR / public enumeration | Private bucket + owned-path signed URLs (1h TTL); PATCH cannot set foreign URLs |
| Admin | Privilege escalation | `profiles.role=admin`, TOTP AAL2, hub password session, `ADMIN_EMAIL` allowlist, audit log |

## Authentication flow

1. Email OTP → Supabase session (AAL1)
2. TOTP enrolled users → `/login/mfa` → AAL2 required for API (`requireMfaIfEnrolled`)
3. Admin routes → `requireAdmin()` = admin role + **AAL2 (enrolled TOTP)** + hub password session
4. Sensitive actions (delete, export, billing portal) → MFA AAL2 when enrolled, else email OTP step-up cookie / fresh login (≤10m) + CSRF
5. All authenticated mutating APIs → CSRF by default (`defineRoute`)

## Leaked password protection (HIBP)

Operator-owned GoTrue setting (**Supabase Pro**). Enable via dashboard or:

```bash
node scripts/ops/enable-hibp.mjs
```

Evidence checklist: [faz4-security-reliability.md](./operations/evidence/faz4-security-reliability.md)

**Waiver (2026-08-05):** Deferred on Free/non-Pro plan (paid feature). App is OTP-first; revisit on Pro upgrade.

## API surface

All routes use `defineRoute` family ([api-inventory.md](./api-inventory.md)):

- Auth → rate limit → CSRF (default on mutating cookie-auth) → handler
- Cron routes → `CRON_SECRET` bearer (timing-safe compare)
- Public routes → IP rate limits via `enforcePublicRateLimit` (fail-closed in prod without Upstash, except health)

## Database (RLS + RPC)

- **RLS** on all user tables; `protect_profile_columns` trigger blocks privilege escalation
- **Mutations** via service-role RPCs: check-in, gems, market purchase, streak rewards
- **chat_messages**: SELECT own; INSERT revoked from client (API only)
- **admin_get_*** / economy mint RPCs: service_role only (Faz 0 lockdown + JWT guards)
- **Bootstrap admin**: `20260706150000_bootstrap_first_admin.sql` is a one-shot migration that promotes the earliest profile when no admin exists. Do **not** re-run against production after the first admin exists; never leave a zero-admin state on a multi-tenant DB.

## Edge / transport

- CSP with per-request nonce; Termly legal embed isolated on `/privacy`, `/terms`, `/cookies`
- HSTS, COOP, CORP via `vercel.json`
- Origin check on mutating API requests (CSRF defense in depth)
- Double-submit CSRF cookie (`kaify_csrf`) on authenticated mutations (and export GET)
- Dedicated `CSRF_SECRET` and **required** `ADMIN_HUB_SECRET` in production/preview (no CSRF fallback — see `lib/auth/admin-hub-session.ts`)
- Middleware IP rate limits are **soft-open** in production when Upstash flaps (memory fallback) so Redis outage does not 429 the whole product; expensive AI handlers still **fail-closed** via `enforceUserRateLimit`

## Secrets checklist (production / preview)

| Variable | Required |
|----------|----------|
| `CSRF_SECRET` | Yes |
| `ADMIN_HUB_PASSWORD` | Yes |
| `ADMIN_HUB_SECRET` | Yes (dedicated HMAC; do not reuse CSRF) |
| `ADMIN_EMAIL` | Recommended (restricts hub to one operator email) |
| `CRON_SECRET` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Yes in production |

## Auth dashboard (manual)

- Enable **Prevent use of leaked passwords** (HaveIBeenPwned) under Authentication → Providers → Email when on Pro+ entitlement: https://supabase.com/dashboard/project/urnetodzvszmddzdazdj/auth/providers?provider=Email

## WAF (operational)

Recommended production stack:

1. **Cloudflare** (free) or **Vercel Firewall** in front of `kaifyai.org`
2. Rate limit `/api/*` at edge (complements Upstash app limits)
3. Bot fight mode on login/waitlist
4. See [waf-runbook.md](./waf-runbook.md)

## Verification

Run before claiming 90+ security score:

```bash
npm test -- tests/security
node scripts/security/prod-bundle-check.mjs
node scripts/security/ai-injection-redteam.mjs
node scripts/security/verify-faz3.mjs
```

Manual checklist: [verification-2026-07.md](./verification-2026-07.md)

## Reporting vulnerabilities

See `/.well-known/security.txt` or email support@kaifyai.org.
