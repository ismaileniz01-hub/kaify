# Verification Sprint — 2026-07

Status: **Template** — fill PASS/FAIL after staging deploy.

## A — Code (prod)

- [ ] Faz 1 migration applied
- [ ] Faz 2 migration applied
- [ ] Faz 3 migration applied (`20260705160000_faz3_security_hardening.sql`)
- [ ] CSRF on delete / export / purchase verified
- [ ] Private avatars + signed URLs

## B — CI (merge blockers)

- [ ] `npm audit --audit-level=high` → 0 high/critical
- [ ] gitleaks → 0 leaks
- [ ] `tests/security/api-route-matrix` pass
- [ ] `tests/security/rls-policies` pass
- [ ] ZAP baseline staging → 0 High (weekly workflow)
- [ ] securityheaders.com → A or A+

## C — Manual OWASP / abuse

| Test | Expected | Result |
|------|----------|--------|
| Client RPC `perform_daily_check_in` | permission denied | |
| Client INSERT `chat_messages` | denied | |
| MFA enrolled, AAL1 `POST /api/chat/alex` | 403 | |
| Upstash removed in prod middleware | 429 fail-closed | |
| CSRF missing on DELETE profile | 403 | |
| Export without CSRF header | 403 | |
| Purchase without CSRF header | 403 | |
| Prod env: no `your_` placeholders | pass | |
| `DAILY_CHEST_LIMIT_ENABLED` not false | pass | |

## D — Documentation

- [ ] `docs/SECURITY.md` published
- [ ] `/.well-known/security.txt` live
- [ ] Prod deploy matches Faz 3 commit SHA: ___________

Signed off: __________ Date: __________
