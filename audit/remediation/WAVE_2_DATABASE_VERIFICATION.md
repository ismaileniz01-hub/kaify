# Wave 2 — Database + Verification Foundation

**Date:** 2026-08-12  
**Source of truth:** `audit/KAIFY_PROFESSIONAL_PRODUCT_AUDIT.md`  
**Wave 1 report:** `audit/remediation/WAVE_1_IMMEDIATE_BLOCKERS.md`  
**Scope:** DB-001 → TEST-002 → TEST-001 (dependency order). Wave 3+ out of scope.

---

## EXECUTIVE RESULT

Wave 2 repairs migration reproducibility for clean databases, adds a live RLS/RPC authorization suite gated in CI via local Supabase, and replaces the dishonest cherry-picked coverage gate with an honest `lib/**` + `app/api/**` scope and regression-floor thresholds.

**Local agent host:** no Docker / no WSL → live `supabase db reset` and live RLS/RPC cannot execute here.  
**Verification of clean reset + live auth suite:** delegated to CI job `database` (GitHub Actions ubuntu + Docker + Supabase CLI). Status below reflects post-push CI evidence when available; otherwise `BLOCKED_RUNTIME_ENVIRONMENT` for runtime DB items.

---

## PHASE A — BASELINE (re-measured at HEAD before Wave 2 finish)

### DB_RESET_BASELINE
**FAIL** (pre-fix) — bridge migration referenced legacy profile columns that are never created on a clean chain.  
**Local reproduce:** blocked (no Docker). Static parse-path confirmed: top-level `UPDATE`/`p.full_name` would fail PostgreSQL parse on clean DB.

### DATABASE_TESTS_BASELINE
**0** live database-backed authorization tests (audit + re-check). Only migration-text regex in `tests/security/rls-policies.test.ts`.

### COVERAGE_SCOPE_BASELINE
| Metric | Value |
|---|---|
| Application source files (`lib`+`app`+`components`) | 500 |
| Application LOC | 49,480 |
| Files in old `coverage.include` | 34 |
| LOC in old include | 2,776 |
| % of application LOC represented | **5.61%** |
| Old headline coverage | ~86% (of that tiny subset) |

Breakdown (application surface):

| Area | Files | LOC |
|---|---|---|
| lib | 241 | 24,470 |
| app/api | 100 | 3,368 |
| lib/services | 45 | 7,529 |
| lib/ai | 20 | 2,513 |
| lib/security | 7 | 466 |
| lib/billing | 7 | 262 |
| lib/compliance | 4 | 220 |
| lib/cache | 2 | 158 |
| lib/repositories | 2 | 279 |
| components | 108 | 15,943 |
| app (all) | 151 | 9,067 |

Wave 1 assumptions unchanged for Wave 2 targets (account deletion, cache, notifications, analytics, billing, chat still present; not re-opened except regression suite).

---

## DB-001

### Status
**VERIFIED** (CI evidence) — double `supabase db reset --local --yes` completed successfully on GitHub Actions after migration chain repairs. Local agent still cannot run Docker.

### Before
`20260703140000_schema_bridge_profiles.sql` ran a top-level `UPDATE public.profiles` referencing `full_name`, `subscription_tier`, `height`, `weight`, `experience`. None of those columns are created by earlier migrations. `20260704190000_leaderboard_privacy_and_cron_monitor.sql` selected `p.full_name`.

### Root cause
Production bridge SQL was committed into the ordered migration chain without clean-DB guards.

### Fix
1. **Bridge migration** — wrap legacy backfill in `DO $$` + `information_schema.columns` checks + dynamic SQL (parse-safe when columns absent). Canonical columns (`display_name`, `tier`, `height_cm`, …) still `ADD COLUMN IF NOT EXISTS`. Leaderboard helper uses `display_name` only.
2. **Leaderboard privacy migration** — remove `p.full_name`; use `display_name`.
3. **Later migrations** (`20260710160000`, `20260710161000`) — already guarded for legacy `subscription_tier`; inventory confirms no remaining unguarded top-level legacy profile column updates.
4. **Additional clean-DB blockers found via CI and fixed:**
   - vault cron schedules hard-fail without `kaify_cron_secret` → NOTICE-and-skip
   - optional `purchase_market_item(uuid,text)` ALTER/REVOKE → exception guards
   - RLS policy recreate missing English `DROP` names
   - `gem_ledger.transaction_type` vs `type` drift in backfill / country leaderboard
   - duplicate migration timestamps `20260704180000` / `20260705140000` uniquified
5. **Static tests** — `tests/db/migration-reproducibility.test.ts`.
6. **Ops** — `scripts/ops/inventory-legacy-profile-cols.mjs`, `scripts/ops/verify-clean-db-reset.mjs` (refuses production project refs / non-localhost).
7. **CI** — job `database`: full `supabase start` → double `db reset` → `test:db`.

### Clean-DB evidence
- Static: bridge has no unguarded top-level legacy UPDATE; leaderboard has no `p.full_name`.
- Runtime: CI `Reset database from migrations (pass 1)` + `(pass 2)` = **success** (e.g. run on sha `3ce31a0` / subsequent).

### Production-compatibility reasoning
Guards execute backfill **only when** legacy columns exist. Clean DB skips backfill and uses canonical columns. Production-like DBs with legacy columns still migrate values into `display_name` / `tier` / `height_cm` / `weight_kg` / `experience_level`. No permanent fake legacy columns added. Historical bridge semantics preserved.

### Tests
- Static migration reproducibility (always on).
- Live critical tables/enums/functions after reset (`KAIFY_DB_TESTS=1`).

---

## TEST-002

### Status
**BLOCKED_RUNTIME_ENVIRONMENT** on the local agent (no Docker/WSL). Suite is complete and gated behind `KAIFY_DB_TESTS=1` / `vitest.db.config.ts`. Final VERIFIED requires CI `database` job green.

### Suite layout
| File | Role |
|---|---|
| `tests/db/setup.ts` | USER_A/USER_B JWT clients, service setup/teardown, diagnostic asserts |
| `tests/db/seed.ts` | Deterministic owned rows per user |
| `tests/db/schema-registry.ts` | 44 public tables classified (`user_own` / `service_only` / `authenticated_read` / `skip_reason`) |
| `tests/db/rpc-registry.ts` | SECURITY DEFINER functions classified (`client_callable` / `service_only` / `trigger_only` / `internal`) |
| `tests/db/rls-authorization.test.ts` | Cross-user denial matrix |
| `tests/db/rpc-authorization.test.ts` | EXECUTE + identity / forge denial |
| `tests/db/migration-reproducibility.test.ts` | Static + live schema |
| `vitest.db.config.ts` | Forces `KAIFY_DB_TESTS=1` |
| `scripts/ops/check-db-registries.mjs` | Static completeness helper |

### Number of database-backed tests
Designed matrix (live, when enabled):
- **~28** `user_own` cross-user cases (select A allowed; select/update/delete B denied)
- **~10** `service_only` deny-all for authenticated
- **~3** `authenticated_read` select-ok / write-denied
- **~25** `service_only` RPC EXECUTE denials
- **~7** client-callable / forge / leaderboard cases
- Completeness + classification + live migration schema checks

Exact CI count recorded under `DATABASE_TESTS` after the green run.

### Tables covered
All **44** public base tables registered. High-risk exercised as `user_own` or `service_only` including: profiles, chat_messages, coaching_memory, analytics_daily, gem_ledger, market inventory, paddle_*, notifications, consent_*, team_meeting_weeks, domain_events, billing_events, ai_usage_ledger, idempotency_keys, etc. `support_messages` explicitly `skip_reason` (ownership via ticket join).

### Functions/RPCs covered
**42** SECURITY DEFINER functions registered (audit baseline 43; re-measure asserted in suite). Client-callable exercised; service-only EXECUTE denied for authenticated; trigger_only/internal classified.

### Cross-user denial results
USER_A cannot read/update/delete USER_B rows on `user_own` tables (and symmetric expectations where seeded). Failures use diagnostic messages: table, op, actor, owner, expected, actual.

### Internal table results
Authenticated cannot SELECT/INSERT/UPDATE/DELETE on `service_only` tables.

### Schema-drift protection
Live completeness tests: every public base table and every SECURITY DEFINER function must appear in registries. Adding a table/RPC without classification fails CI.

### Environment safety
Service role used only for seed/teardown. RLS proofs use authenticated user JWTs. Production project refs refused by verify script + CI local-host check. No destructive tests against production.

---

## TEST-001

### Status
**VERIFIED**

### Old coverage scope
34 cherry-picked files · 2,776 LOC · **5.61%** of application LOC · headline ~**86%**

### New coverage scope
`lib/**/*.ts` + `app/api/**/*.ts` with justified excludes (types, lang, supabase client glue, capacitor/native).

| Metric | Value |
|---|---|
| Files in new include (approx) | 339 |
| LOC in new include | 27,519 |
| % of application LOC represented | **55.62%** |
| Honest headline (statements) | **25.39%** (1731/6817) |
| Branches | 23.23% |
| Functions | 29.25% |
| Lines | 25.85% |

### CI thresholds (honest regression floor)
`statements: 22`, `branches: 18`, `functions: 24`, `lines: 22`  
(Not the old ~75–86% cherry-picked gate.)

### New tests added (coverage honesty / critical path)
- `tests/architecture/coverage-scope.test.ts`
- `tests/unit/home-service.test.ts`
- Full DB auth suite (counts toward verification, not toward node coverage of SQL)

Frontend component/page coverage deferred (later UX wave), by design.

---

## DATABASE

| Gate | Result |
|---|---|
| CLEAN_RESET | **PASS** (CI double reset) |
| RLS_RUNTIME | **BLOCKED** until live `test:db` green on full Auth/API stack |
| RPC_AUTHORIZATION | **BLOCKED** until live `test:db` green |
| CI_DATABASE_GATE | Configured; Auth/API start + export keys were the remaining failure mode (fixed in `6e08fe4`+) |

---

## WAVE 1 REGRESSION GUARD

Re-ran security, compliance, architecture, idempotency, OTP throttle, home-service, and static migration tests: **28 files, 169 passed, 3 skipped**. Full unit suite **103 files / 546 passed / 3 skipped**. No Wave 1 regressions observed from migration/coverage changes.

---

## LOCAL / CI GATES (agent host)

| Gate | Result |
|---|---|
| Vitest (unit/integration, live DB excluded) | PASS — 546 passed, 3 skipped |
| Coverage | PASS — ~25% statements @ new thresholds |
| Typecheck | PASS |
| lint:strict | PASS |
| production build | PASS |
| bundle budget | PASS |
| npm audit --audit-level=high | PASS — 0 vulnerabilities |
| Playwright / Lighthouse / k6 | Covered by CI `verify` job (not re-run fully on Windows agent for Wave 2 close) |
| Live DB suite | CI only |

---

## WAVE_2_STATUS
COMPLETE_WITH_EXTERNAL_BLOCKER

## DB_001
VERIFIED

## TEST_002
BLOCKED

## TEST_001
VERIFIED

## P0_OPEN
0

## P1_OPEN
1

## TOTAL_TESTS
549 (546 passed + 3 skipped in default Vitest; live DB suite additional in CI)

## DATABASE_TESTS
0 executed on local agent. Clean reset proven in CI. Live RLS/RPC suite pending green Auth/API + `test:db`.

## COVERAGE_SCOPE_LOC_PERCENT
55.62%

## COVERAGE_STATEMENTS
25.39%

## TYPECHECK
PASS

## LINT
PASS

## BUILD
PASS

## NPM_AUDIT_HIGH
PASS

## EXTERNAL_ACTION_REQUIRED
CI `database` job must finish green on full stack (`supabase start` with Kong/Auth on :54321 + `npm run test:db`). Local Docker/WSL optional. Until then TEST-002 remains BLOCKED and P1_OPEN = 1.

---

## STOP

Wave 2 complete. Do **not** begin Wave 3 (security/privacy P2/P3) until instructed.
