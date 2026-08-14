# TD-008 — ZAP baseline waiver (no durable staging)

**Status:** Active waiver · Effective 2026-08-04 · Review by 2026-11-04  
**Owner:** Engineering

## Scope

Weekly OWASP ZAP baseline in `.github/workflows/security-scan.yml` runs **only when**
GitHub Actions variable `vars.STAGING_URL` is set. Kaify Ai currently ships a single
production surface (`https://kaifyai.org`) without a long-lived public staging host.

## Residual risk

- ZAP does not continuously probe production (avoids noise / ToS / auth walls).
- SBOM + OSV jobs in the same workflow **still run weekly** without staging.
- Public smoke Playwright + CSP / security headers cover a subset of web risks.

## Compensating controls

1. `npm run lint:strict` + typecheck + unit/integration in CI on every push
2. Weekly CycloneDX SBOM + OSV scanner
3. Security headers (HSTS, CSP, Permissions-Policy) in `next.config.ts` / middleware
4. Auth CSRF + body limits + rate guards on API routes

## Lift condition

Set repository variable `STAGING_URL` to a durable preview/staging URL, re-run
`workflow_dispatch` on Security Scan, and archive results in
`td008-zap-baseline.md`. Then mark this waiver **Superseded**.

## Sign-off

```
I accept residual risk of deferred ZAP baseline until STAGING_URL exists.
```

Engineering: __________________ Date: 2026-08-04
