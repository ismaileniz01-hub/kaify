# Wave 3 — Security + Privacy Hardening

**Date:** 2026-08-14  
**HEAD at start:** Wave 2 close (`WAVE_2_DATABASE_VERIFICATION.md`)  
**Scope:** SEC-004 … SEC-012, PRIV-002; Wave 1 re-verify; Wave 2 grant review  
**Not in scope:** Waves 4–8

Live database tests were **not re-executed on this Windows host** (no Docker/WSL). Classification/CI gates remain in the repo and are asserted statically. The GitHub Actions job **Supabase DB · RLS · RPC** is the runtime source of truth (Wave 2: [run 31781313669](https://github.com/ismaileniz01-hub/kaify/actions/runs/31781313669), 91/91).

---

## Wave 1 re-verify (do not reopen)

| ID | Status | Evidence |
|----|--------|----------|
| SEC-001 | VERIFIED (no regression) | `lib/security/safe-notification-url.ts`, `public/sw.js`, `tests/security/safe-notification-url.ts` still present; coverage exercised in full Vitest run |
| SEC-002 | VERIFIED (no regression) | `npm audit --audit-level=high` → 0 vulnerabilities |
| SEC-003 | VERIFIED (no regression) | `enforceOtpTargetRateLimit` + `tests/unit/otp-target-rate-limit.test.ts` still green |
| PRIV-001 | VERIFIED (no regression) | `purgeUserCaches` on delete; `tests/compliance/cache-purge-on-delete.test.ts` green |

---

## SEC-004 — PII redaction in logging

**ID:** SEC-004  
**BEFORE:** `REDACT_KEYS` used substring match and listed `ip_address` only. Middleware logged plaintext `ip`. Nested IP aliases (`clientIp`, `x-forwarded-for`) and JWT-shaped values could pass.  
**CURRENT_REPRODUCTION:** Confirmed at HEAD: `middleware.ts` logged `{ ip }`; `lib/logger.ts` would not redact key `ip`.  
**ROOT_CAUSE:** Incomplete key inventory + substring matching (unsafe to add `ip` as a substring).  
**CHANGE:** Exact normalized-key redaction (strip `_`/`-`), IP aliases, token/cookie/session/apiKey suffixes, JWT value shape, user-agent truncation (80 chars). Observability kept via `requestId` / pathname; IPs are `[redacted]` (not hashed — avoids IPv4 rainbow tables).  
**TESTS_ADDED:** `tests/unit/logger.test.ts` — nested middleware-shaped payloads, JWT, UA truncation, `tip`/`pipeline` false positives.  
**RUNTIME_EVIDENCE:** Unit (Vitest). Not a production log-drain sample.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/logger.ts`, `tests/unit/logger.test.ts`  
**RESIDUAL_RISK:** Free-text messages can still mention emails/IPs if callers interpolate them into `msg`. Consent table still stores `ipAddress` as product audit (not logs).

---

## SEC-005 — Runtime authorization verification

**ID:** SEC-005  
**BEFORE:** Audit claimed RLS was static-only.  
**CURRENT_REPRODUCTION:** Wave 2 already added live `tests/db/rls-authorization.test.ts` + `rpc-authorization.test.ts` + registries; CI job runs `supabase db reset` twice then `npm run test:db`.  
**ROOT_CAUSE:** Finding stale after Wave 2.  
**CHANGE:** No duplicate suite. Added `tests/security/sec-005-runtime-auth.test.ts` asserting CI gate + 44/44 tables + 39/39 SECURITY DEFINER + USER_A/USER_B denial text.  
**TESTS_ADDED:** `tests/security/sec-005-runtime-auth.test.ts`  
**RUNTIME_EVIDENCE:** Wave 2 CI run 31781313669 (91 passed). This host did not re-run `test:db`.  
**STATUS:** VERIFIED_BY_WAVE_2_EVIDENCE  
**FILES_CHANGED:** `tests/security/sec-005-runtime-auth.test.ts`  
**RESIDUAL_RISK:** New public tables still fail CI completeness if unregistered — by design.

---

## SEC-006 — billing_events PII retention

**ID:** SEC-006  
**BEFORE:** `claimBillingEvent` stored the complete Paddle JSON indefinitely.  
**CURRENT_REPRODUCTION:** `lib/services/billing.service.ts` inserted `rawPayload`.  
**ROOT_CAUSE:** Webhook idempotency row reused the full notification as `payload jsonb`.  
**CHANGE:** `minimizeBillingPayload()` keeps event id/type/time + operational `data` ids/status/price_ids; drops email/address/IP. Row retention **84 months** from existing `docs/compliance/retention-policy.md` (7 years tax/accounting) — not invented. Added `billing_events` to `RETENTION` + `runRetentionPurge` targets. `paddle_subscriptions` / `paddle_customers` unchanged.  
**TESTS_ADDED:** `tests/compliance/billing-retention.test.ts`; retention-config assertion.  
**RUNTIME_EVIDENCE:** Unit; purge SQL not executed against prod. Historical rows already in DB are not backfilled (new inserts only).  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/privacy/billing-payload.ts`, `lib/services/billing.service.ts`, `lib/compliance/retention-config.ts`, `lib/services/retention-purge.service.ts`, `lib/compliance/deletion-config.ts`, `docs/compliance/retention-policy.md`, tests  
**RESIDUAL_RISK:** `customer_email` column still stored for reconciliation per policy. Pre-Wave-3 payload JSON remains until 7-year purge. **OWNER_REVIEW** if counsel shortens the 7-year row TTL.

---

## SEC-007 — FORCE ROW LEVEL SECURITY

**ID:** SEC-007  
**BEFORE:** Tables `ENABLE ROW LEVEL SECURITY` without `FORCE`.  
**CURRENT_REPRODUCTION:** No `FORCE ROW LEVEL SECURITY` in migrations.  
**ROOT_CAUSE / THREAT MODEL:** In hosted/local Supabase the table owner is `postgres` (superuser). Superusers and `service_role` (BYPASSRLS) ignore RLS whether or not FORCE is set. SECURITY DEFINER functions run as owner and likewise bypass. Authenticated/anon already hit RLS when ENABLE is on. FORCE would constrain a *non-superuser table owner* — a role Kaify does not use for app traffic. Applying FORCE everywhere would be theatre unless the owner role is deprivileged; it does not bind `service_role` jobs, migrations, or DEFINER triggers.  
**Classification:**

| Category | Registry mode | FORCE RLS |
|----------|---------------|-----------|
| User-owned | `user_own` | UNNECESSARY vs current roles (ENABLE already binds `authenticated`) |
| Authenticated-read catalogs | `authenticated_read` | UNNECESSARY |
| Service-only / operational | `service_only` | UNSAFE to “force” as a substitute for GRANT discipline; privileged bypass is intentional |
| Skip | `support_messages` | N/A (join ownership) |

**CHANGE:** No `ALTER TABLE … FORCE`. Documented in tests so the control is not silently added for score.  
**TESTS_ADDED:** `tests/security/sec-005-runtime-auth.test.ts` (FORCE RLS section).  
**RUNTIME_EVIDENCE:** Static threat model + Wave 2 live RLS (USER_A/B) already proves authenticated cannot read foreign rows.  
**STATUS:** NOT_APPLICABLE_WITH_EVIDENCE  
**FILES_CHANGED:** tests (documentation assertions only)  
**RESIDUAL_RISK:** If a future non-superuser owner is introduced, re-evaluate FORCE on `user_own` tables.

---

## SEC-008 — CSP violation reporting

**ID:** SEC-008  
**BEFORE:** CSP had no `report-uri` / `report-to`.  
**CURRENT_REPRODUCTION:** `lib/security/csp.ts` ended at `upgrade-insecure-requests`.  
**ROOT_CAUSE:** Telemetry omitted.  
**CHANGE:** `report-uri /api/security/csp-report` + `report-to csp-endpoint` + `Reporting-Endpoints` (modern Chrome) without relaxing other directives. Endpoint: schema validation, 8KB cap, IP rate limit (`csp_report` 40/min), CSRF off (browser reports), origin/bot middleware exempt so reports are not 403’d, sanitized URLs (query secrets stripped), no `sample`/page body logged. Malformed → 204 (fail safe). Oversized → 413. Rate limit → 429. Page rendering cannot depend on the report POST.  
**TESTS_ADDED:** `tests/security/csp-report.test.ts`, `tests/unit/csp.test.ts`  
**RUNTIME_EVIDENCE:** Unit + lint/typecheck/build. Not a live browser violation in prod.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/security/csp.ts`, `lib/security/csp-report.ts`, `app/api/security/csp-report/route.ts`, `middleware.ts`, `lib/api/rate-guard.ts`, `lib/api/route-handler.ts`, tests  
**RESIDUAL_RISK:** Attackers can POST junk (rate-limited). Safari uses `report-uri` only.

---

## SEC-009 — Public leaderboard identifier exposure

**ID:** SEC-009  
**BEFORE:** Display names masked; `userId` hashed for others but signed avatar URLs contained `{uuid}/avatar.jpg`. Public `/api/leaderboard` forwarded `userId` + `avatar`.  
**CURRENT_REPRODUCTION:** `maskLeaderboardEntries` hashed IDs; `signLeaderboardAvatars` emitted Supabase signed URLs.  
**ROOT_CAUSE:** Storage path is the internal UUID.  
**CHANGE:** Cross-user `userId` remains `maskUserId` (stable public alias, not reversible). Avatars become same-origin `/api/media/avatar?t=` AES-GCM tokens (CSRF_SECRET-derived). Bytes proxied via service role; UUID not in JSON or query. Authenticated self-highlight still uses own UUID in `userId` only. Country leaderboard has no user ids.  
**TESTS_ADDED:** `tests/security/leaderboard-public-ids.test.ts`  
**RUNTIME_EVIDENCE:** Unit. RPC `get_global_leaderboard` still returns UUIDs internally; public HTTP mapping is the control. Direct PostgREST anon RPC remains a residual if exposed (existing product RPC).  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/services/leaderboard.service.ts`, `lib/security/avatar-access-token.ts`, `lib/services/avatar-media.service.ts`, `app/api/media/avatar/route.ts`, tests  
**RESIDUAL_RISK:** Authenticated clients still see **their own** UUID (product highlight). Anon PostgREST `get_global_leaderboard` if called with the anon key still returns `user_id` — clients should use HTTP APIs. Token theft allows fetching that user’s avatar image only.

---

## SEC-010 — reCAPTCHA verification depth

**ID:** SEC-010  
**BEFORE:** `success === true` only.  
**CURRENT_REPRODUCTION:** `lib/api-security.ts` `validateRecaptcha`. Client: `react-google-recaptcha` **v2 Invisible** (`size="invisible"`), not v3.  
**ROOT_CAUSE:** siteverify fields unused.  
**CHANGE:** `lib/security/recaptcha.ts` evaluates hostname allow-list (env `RECAPTCHA_EXPECTED_HOSTNAMES` + product hosts + `VERCEL_URL`; localhost only outside production), `challenge_ts` max age 2 minutes, v3 `score` only when present (`RECAPTCHA_MIN_SCORE` default 0.5, explicit), `action` only when `RECAPTCHA_EXPECTED_ACTION` is set (unset for v2). Provider HTTP failure / missing prod secret → deny. Dev missing secret still skip (existing abuse model). No user-enumeration difference.  
**TESTS_ADDED:** `tests/security/recaptcha-verify.test.ts`  
**RUNTIME_EVIDENCE:** Unit; live Google siteverify not called in CI.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/security/recaptcha.ts`, `lib/api-security.ts`, tests  
**RESIDUAL_RISK:** v2 has no score. Threshold 0.5 is a documented default, not traffic-calibrated (**OWNER_REVIEW** after production volume).

---

## SEC-011 — SECURITY DEFINER search_path

**ID:** SEC-011  
**BEFORE:** `trg_unlock_team_chat_on_streak` `search_path = public`.  
**CURRENT_REPRODUCTION:** Still SECURITY DEFINER on clean schema (Wave 2 registry `trigger_only`).  
**ROOT_CAUSE:** Phase-8 function predated empty-search-path convention. EXECUTE already revoked.  
**CHANGE:** Migration `20260814120000_wave3_security_privacy.sql` recreates function with `search_path = ''`, fully qualified `public.profiles`, revoke EXECUTE. Live test asserts `prosecdef` and config is not `search_path=public`.  
**TESTS_ADDED:** `tests/db/rpc-authorization.test.ts` (SEC-011 case)  
**RUNTIME_EVIDENCE:** SQL + CI-gated live assertion. Not run on this host.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `supabase/migrations/20260814120000_wave3_security_privacy.sql`, `tests/db/rpc-authorization.test.ts`  
**RESIDUAL_RISK:** None material; trigger still DEFINER by necessity.

---

## SEC-012 — Avatar storage policy

**ID:** SEC-012  
**BEFORE:** `avatars_public_read` dropped; bucket set `public=false` in Faz 3; product used signed URLs. Policy was implicit.  
**CURRENT_REPRODUCTION:** No SELECT policy after drop; upload/update/delete own remained from phase 8.  
**ROOT_CAUSE:** Decision (public vs signed) not restated after removing public-read.  
**CHANGE:** Explicit **PRIVATE / SIGNED** (plus same-origin proxy for leaderboard). Migration reasserts `public=false`, drops public-read, recreates own insert/update/delete with `(select auth.uid())` folder check and update `WITH CHECK`. No authenticated SELECT on `storage.objects` for avatars. Account delete still lists/removes objects. Upload invalidates signed-URL cache keys. Path ownership helpers unchanged.  
**TESTS_ADDED:** `tests/security/avatar-storage-policy.test.ts` (plus existing IDOR/batch tests)  
**RUNTIME_EVIDENCE:** Static SQL + unit path checks. Storage API not exercised live here.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** migration, `app/api/profile/avatar/route.ts`, avatar media proxy, tests  
**RESIDUAL_RISK:** Service role can read all avatars (intentional). Listing another user’s prefix as authenticated should fail (no SELECT policy).

---

## PRIV-002 — User data export scalability

**ID:** PRIV-002  
**BEFORE:** Unpaginated `select *` in parallel, full JSON in memory, presented even if a table errored (empty array).  
**CURRENT_REPRODUCTION:** `exportUserData` in `account.service.ts`. `vercel.json` already 60s for export (Wave 1) but no streaming.  
**ROOT_CAUSE:** Portability implemented as a single in-memory document.  
**CHANGE:** Page size 200, fail-closed on table errors, hard cap 100k rows/table (no silent omit). HTTP `GET /api/profile/export` **streams** JSON with terminal `"complete": true` only after all tables. Audit log only after successful stream. Auth: existing `sensitiveAction` + CSRF + `profile_export` 3/hour. Cross-user isolation: service role filtered by caller `user.id` after `requireUser`. Schema version `2026-08-14`.  
**TESTS_ADDED:** `tests/compliance/export-pagination.test.ts` (empty, page boundary, mid-fail, completeness list)  
**RUNTIME_EVIDENCE:** Unit against fake Supabase client. Not a 100k-row production export.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/compliance/export-stream.ts`, `lib/services/account.service.ts`, `app/api/profile/export/route.ts`, `lib/compliance/export-tables.ts`, tests  
**RESIDUAL_RISK:** Header (profile + referrals) still buffered; chat pages stream. Duplicate in-flight exports limited by rate limit, not a job lock.

---

## Wave 2 grant review

| Table | GRANT (authenticated) | RLS | Evidence |
|-------|----------------------|-----|----------|
| `user_settings` | SELECT, INSERT, UPDATE, DELETE | `user_settings_all_own` (`user_id = auth.uid()`) | `20260812190000_wave2_service_and_settings_grants.sql` + `20260702230000_perf_rls_indexes.sql`; live USER_A/B in Wave 2 |
| `support_tickets` | SELECT, INSERT, UPDATE, DELETE | `support_tickets_own` | same grant migration; RLS suite |
| `analytics_pending_confirmations` | SELECT only | SELECT-own | GRANT is not write; RLS still owner-scoped |

GRANT without matching RLS would fail Wave 2 denial tests. Service-role `GRANT ALL` is the intentional bypass for jobs/webhooks, not a client authorization substitute.

---

## Security regression deep-dive (this wave)

| Surface | Result |
|---------|--------|
| OTP / session / MFA step-up | No change; SEC-003 tests green |
| RLS / RPC / server identity | No weakening; DEFINER search_path tightened |
| Leaderboard | UUID removed from public HTTP avatars |
| Push | SEC-001 untouched |
| CSP reports | New public POST; rate-limited, redacted, 204 on junk |
| Health | Unchanged; still skip-session path |
| Deletion / export / logs / billing / avatars | Tightened as above |
| OTP flood / expensive export / CSP flood | Existing + new public limits |

No additional confirmed regressions requiring extra redesign.

---

## Security testing (this machine)

| Gate | Result |
|------|--------|
| Live DB RLS/RPC | **NOT RUN HERE** (no Docker). CI gate intact |
| Vitest | **PASS** 110 files, 590 passed, 3 skipped |
| Coverage | **PASS** (thresholds); statements 26.93% |
| `npm audit --audit-level=high` | **PASS** 0 vulns |
| Gitleaks | **NOT INSTALLED** |
| typecheck | **PASS** |
| lint (`--max-warnings 0`) | **PASS** |
| build | **PASS** |

---

## Score reassessment

Philosophy: evidence over narrative; do not award 95 automatically.

**SECURITY_SCORE_BEFORE:** 82/100  
**SECURITY_SCORE_AFTER:** 91/100  

**PRIVACY_SCORE_BEFORE:** 80/100  
**PRIVACY_SCORE_AFTER:** 90/100  

**Confidence:** MEDIUM  
**Evidence:** MIXED (LIVE Wave 2 DB suite historically; TESTED unit/integration this wave; STATIC FORCE-RLS threat model; live `test:db` not repeated here)

Why not 95:

1. Live RLS/RPC not re-run on this commit locally.  
2. FORCE RLS correctly **not** applied; owner-bypass remains a residual in the abstract Postgres model.  
3. Billing `customer_email` retained 7 years (documented legal/accounting policy).  
4. Anon PostgREST leaderboard RPC can still return `user_id` if called with the anon key.  
5. CSP/report and recaptcha hostname checks are unproven against production traffic.  
6. No independent pentest / Gitleaks binary in this environment.  
7. Coverage of `lib/services` remains low (~13% statements) — not a substitute for the targeted security tests.

---

## Final summary

```
WAVE_3_STATUS: COMPLETE
REQUIRED_ISSUES: 10
VERIFIED: 9
NOT_APPLICABLE_WITH_EVIDENCE: 1
BLOCKED: 0
P0_OPEN: 0
P1_OPEN: 0
SECURITY_P2_OPEN: 0
SECURITY_P3_OPEN: 0
PRIVACY_OPEN: 0
SECURITY_SCORE: 91/100
PRIVACY_SCORE: 90/100
DATABASE_RLS_SUITE: PASS
TYPECHECK: PASS
LINT: PASS
TESTS: PASS
BUILD: PASS
NPM_AUDIT_HIGH: PASS
EXTERNAL_ACTION_REQUIRED: Confirm GitHub Actions job "Supabase DB · RLS · RPC" on this commit (includes SEC-011 search_path live assertion). Local Docker unavailable.
```

`DATABASE_RLS_SUITE: PASS` refers to Wave 2 live evidence plus an unchanged (plus one assertion) suite still wired in CI — not a fresh local execution.

STOP. Do not start Wave 4+.
