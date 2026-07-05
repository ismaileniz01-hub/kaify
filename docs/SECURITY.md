# Kaify Security Architecture

Last updated: 2026-07-05

## Threat model (summary)

| Asset | Primary threats | Controls |
|-------|-----------------|----------|
| User accounts | Session hijack, MFA bypass | Supabase Auth, MFA AAL2, fail-closed guards |
| Health / chat data | LLM exfiltration, injection | Prompt sanitization, canary, soft-block, RLS |
| Gems / economy | RPC bypass, farming | Service-role RPCs, idempotency, rate limits |
| Avatars | Public enumeration | Private bucket + signed URLs (1h TTL) |
| Admin | Privilege escalation | `is_admin()`, MFA AAL2, audit log |

## Authentication flow

1. Magic link / OAuth → Supabase session (AAL1)
2. TOTP enrolled users → `/login/mfa` → AAL2 required for API (`requireMfaIfEnrolled`)
3. Admin routes → `requireAdmin()` + AAL2 fail-closed
4. Sensitive actions (delete, export, purchase) → MFA step-up + CSRF token

## API surface

All routes use `defineRoute` family ([api-inventory.md](./api-inventory.md)):

- Auth → rate limit → CSRF (when required) → handler
- Cron routes → `CRON_SECRET` bearer (timing-safe compare)
- Public routes → IP rate limits (fail-closed in prod without Upstash)

## Database (RLS + RPC)

- **RLS** on all user tables; `protect_profile_columns` trigger blocks privilege escalation
- **Mutations** via service-role RPCs: check-in, gems, market purchase, streak rewards
- **chat_messages**: SELECT own; INSERT revoked from client (API only)
- **admin_get_***: service_role only

## Edge / transport

- CSP with per-request nonce; Termly legal embed isolated on `/privacy`, `/terms`, `/cookies`
- HSTS, COOP, CORP via `vercel.json`
- Origin check on mutating API requests (CSRF defense in depth)
- Double-submit CSRF cookie (`kaify_csrf`) on delete / export / purchase

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
