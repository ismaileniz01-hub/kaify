# Wave 2 — Database + Verification Foundation

**Date:** 2026-08-14  
**Source of truth:** `audit/KAIFY_PROFESSIONAL_PRODUCT_AUDIT.md`  
**Wave 1 report:** `audit/remediation/WAVE_1_IMMEDIATE_BLOCKERS.md`  
**Scope:** DB-001 → TEST-002 → TEST-001 (dependency order). Wave 3+ out of scope.

**CI evidence (TEST-002):** GitHub Actions run [31781313669](https://github.com/ismaileniz01-hub/kaify/actions/runs/31781313669) on `bbb3036` (includes `4491267` grants + SECDEF registry 39). Job **Supabase DB · RLS · RPC** = **PASS** (start → double reset → key export → auth smoke → `npm run test:db`).

---

## EXECUTIVE RESULT

Wave 2 repairs migration reproducibility for clean databases, adds a live RLS/RPC authorization suite gated in CI via local Supabase, and replaces the dishonest cherry-picked coverage gate with an honest `lib/**` + `app/api/**` scope and regression-floor thresholds.

**Local agent host:** no Docker / no WSL → live `supabase db reset` cannot execute here.  
**Live verification:** CI job `database` (ubuntu + Docker + Supabase CLI). TEST-002 is closed on a green live `npm run test:db` run, not static regex.

---

## PHASE A — BASELINE (re-measured at HEAD before Wave 2 finish)

### DB_RESET_BASELINE
**FAIL** (pre-fix) — bridge migration referenced legacy profile columns that are never created on a clean chain.

### DATABASE_TESTS_BASELINE
**0** live database-backed authorization tests. Only migration-text regex in `tests/security/rls-policies.test.ts`.

### COVERAGE_SCOPE_BASELINE
| Metric | Value |
|---|---|
| Application source files (`lib`+`app`+`components`) | 500 |
| Application LOC | 49,480 |
| Files in old `coverage.include` | 34 |
| LOC in old include | 2,776 |
| % of application LOC represented | **5.61%** |
| Old headline coverage | ~86% (of that tiny subset) |

---

## DB-001

### Status
**VERIFIED** — double `supabase db reset --local --yes` succeeded on GitHub Actions after migration chain repairs. Same path remains green on the TEST-002 closing run (reset pass 1 + pass 2).

### Root cause
Production bridge SQL was committed into the ordered migration chain without clean-DB guards; later migrations assumed production-only columns / vault secrets / policy names.

### Fix (summary)
1. Bridge + leaderboard: `information_schema` guards; `display_name` instead of `p.full_name`.
2. Vault cron: NOTICE-and-skip when `kaify_cron_secret` absent.
3. Optional RPC ALTER/REVOKE via ephemeral `__kaify_*` helpers (dropped).
4. English RLS policy DROP names before recreate.
5. `gem_ledger.type` vs `transaction_type` parse-safe country leaderboard.
6. Duplicate migration timestamps uniquified.
7. CI: local project only; production refs refused.

### Production-compatibility
Guards execute legacy backfill **only when** those columns exist. Clean DB skips backfill. No fake legacy columns added.

---

## TEST-002

### Status
**VERIFIED**

Live `npm run test:db` completed green on CI with:
- local Supabase (Kong/Auth/API)
- clean migrations (double reset)
- synthetic USER_A / USER_B
- authenticated JWT clients for RLS/RPC assertions
- service role only for setup/teardown (plus inventory SQL via docker `psql -f`, not app traffic)

### Suite layout
| File | Role |
|---|---|
| `tests/db/setup.ts` | USER_A/USER_B JWT clients, service setup/teardown, diagnostic asserts, `runSqlJson` (no `shell:true`) |
| `tests/db/seed.ts` | Deterministic owned rows per user |
| `tests/db/schema-registry.ts` | Public tables classified |
| `tests/db/rpc-registry.ts` | SECURITY DEFINER functions classified |
| `tests/db/rls-authorization.test.ts` | Cross-user + service-only + catalog matrix |
| `tests/db/rpc-authorization.test.ts` | EXECUTE + identity / forge denial |
| `tests/db/migration-reproducibility.test.ts` | Static + live schema |
| `vitest.db.config.ts` | Forces `KAIFY_DB_TESTS=1` |

### Actual execution results (green `test:db`)

These are the tests that ran (every `it()` under `KAIFY_DB_TESTS=1`). The green job means failed = 0 and skipped = 0.

| Metric | Value |
|---|---|
| DATABASE_TEST_FILES | **3** |
| DATABASE_TESTS_EXECUTED | **91** |
| DATABASE_TESTS_PASSED | **91** |
| DATABASE_TESTS_FAILED | **0** |
| DATABASE_TESTS_SKIPPED | **0** |
| RLS_CASES_EXECUTED | **43** |
| RPC_CASES_EXECUTED | **33** |

Breakdown:
- RLS: 1 completeness + **29** `user_own` + **11** `service_only` + **3** `authenticated_read` + 1 skip_reason docs = 45 tests; **43** of those are access-matrix cases.
- RPC: 1 completeness + 1 SECDEF remasure + **26** service-only EXECUTE denials + **7** client/forge/leaderboard cases + 1 classification = 36 tests; **33** of those are authorization cases.
- Migration: 7 static + 3 live = 10.

### Registry completeness (live clean schema)

| Metric | Value |
|---|---|
| PUBLIC_TABLES_ACTUAL | **44** |
| PUBLIC_TABLES_CLASSIFIED | **44** |
| SECURITY_DEFINER_ACTUAL | **39** |
| SECURITY_DEFINER_CLASSIFIED | **39** |
| Unclassified tables | **0** |
| Unclassified SECURITY DEFINER functions | **0** |

**Intentional RLS skip (1 table):** `support_messages` — ownership is via `support_tickets` join; covered indirectly by `support_tickets` user_own tests. `skipReason` is required and asserted.

**SECURITY DEFINER 43 → 39 drift (original audit vs clean schema):**
The original audit counted **43** names. Live `pg_proc.prosecdef` on a clean migration chain is **39**. These **4** names are **not** SECURITY DEFINER (they remain in the schema as invoker/helpers/triggers):

| Function | Why not in SECDEF registry |
|---|---|
| `build_usage_node` | `language sql immutable` helper (not DEFINER) |
| `is_valid_timezone` | `language sql stable` helper (not DEFINER) |
| `set_updated_at` | trigger function, invoker (not DEFINER) |
| `protect_profile_columns` | trigger function, invoker (not DEFINER) |

Ephemeral `__kaify_*` helpers are created and dropped inside migrations and are filtered from inventory.

### Authorization matrix (runtime, authenticated JWT)

Proved on USER_A / USER_B (not service role):
- USER_A reads allowed USER_A-owned rows; USER_B reads allowed USER_B-owned rows (symmetric seed).
- USER_A cannot read / update / delete USER_B-owned protected rows (`user_own` tables).
- Authenticated users cannot access `service_only` tables.
- Client-callable SECURITY DEFINER RPCs (`get_user_rank`, `get_usage_status`, `is_admin`, leaderboards) enforce auth / caller identity.
- Forged `p_user_id` on `perform_daily_check_in` and `earn_gems` is denied for authenticated users.
- Service-only RPCs are not executable by authenticated users (EXECUTE revoked / denied).
- Trigger-only (`handle_new_user`, `trg_unlock_team_chat_on_streak`) and internal (`generate_referral_code`) are classified, not treated as client RPCs.

### CI database gate

| Check | Result |
|---|---|
| Clean Supabase starts | PASS |
| Double reset succeeds | PASS |
| Local project only | PASS (non-localhost API URL refused) |
| Production refs refused | PASS |
| Live DB tests automatically run | PASS (`npm run test:db` with `KAIFY_DB_TESTS=1`) |
| Failure produces sanitized diagnostics | PASS (check-run + redacted `_CI_DB_FAILURE_LOG.md` on failure) |
| Test failure returns non-zero | PASS (`PIPESTATUS` preserved) |
| CI cannot silently skip the live suite | PASS (job always runs `test:db` after stack is up) |

CI was not weakened to obtain green (no RLS/RPC privilege reductions for tests; grants restored to match existing policies: `user_settings` ALL, `support_tickets` ALL, `analytics_pending_confirmations` SELECT).

---

## TEST-001

### Status
**VERIFIED**

### New coverage scope
`lib/**/*.ts` + `app/api/**/*.ts` with justified excludes (types, lang, supabase client glue, capacitor/native).

| Metric | Value |
|---|---|
| LOC in new include | 27,519 |
| % of application LOC represented | **55.62%** |
| Honest headline (statements) | **25.39%** (1731/6817) |
| Branches | 23.23% |
| Functions | 29.25% |
| Lines | 25.85% |

### CI thresholds (honest regression floor)
`statements: 22`, `branches: 18`, `functions: 24`, `lines: 22`

---

## DATABASE

| Gate | Result |
|---|---|
| CLEAN_RESET | **PASS** |
| RLS_RUNTIME | **PASS** |
| RPC_AUTHORIZATION | **PASS** |
| CI_DATABASE_GATE | **PASS** |

---

## WAVE 1 REGRESSION GUARD

Security, compliance, architecture, idempotency, OTP throttle, home-service, and static migration tests remain in the default Vitest job. Coverage + typecheck + lint passed on the same CI run as TEST-002 close (verify job: lint, typecheck, i18n, test+coverage, build, bundle budget all green before Lighthouse).

---

## LOCAL / CI GATES

| Gate | Result |
|---|---|
| Vitest (unit/integration; live RLS/RPC excluded from default config) | PASS (CI Test + coverage gate) |
| Coverage | PASS — ~25.39% statements @ new thresholds |
| Typecheck | PASS |
| lint:strict | PASS |
| production build | PASS |
| bundle budget | PASS |
| npm audit --audit-level=high | PASS |
| Live DB suite | PASS — CI `database` job |

Lighthouse on the same SHA failed in the verify job (accessibility/byte-weight collect). Wave 2 required gates do not include Lighthouse; thresholds were not changed.

---

## WAVE_2_STATUS
COMPLETE

## DB_001
VERIFIED

## TEST_002
VERIFIED

## TEST_001
VERIFIED

## CLEAN_RESET
PASS

## RLS_RUNTIME
PASS

## RPC_AUTHORIZATION
PASS

## CI_DATABASE_GATE
PASS

## P0_OPEN
0

## P1_OPEN
0

## DATABASE_TESTS
91

## DATABASE_TEST_FILES
3

## DATABASE_TESTS_EXECUTED
91

## DATABASE_TESTS_PASSED
91

## DATABASE_TESTS_FAILED
0

## DATABASE_TESTS_SKIPPED
0

## RLS_CASES_EXECUTED
43

## RPC_CASES_EXECUTED
33

## PUBLIC_TABLES_ACTUAL
44

## PUBLIC_TABLES_CLASSIFIED
44

## SECURITY_DEFINER_ACTUAL
39

## SECURITY_DEFINER_CLASSIFIED
39

## COVERAGE_SCOPE_LOC_PERCENT
55.62%

## COVERAGE_STATEMENTS
25.39%

## TESTS
PASS

## TYPECHECK
PASS

## LINT
PASS

## BUILD
PASS

## NPM_AUDIT_HIGH
PASS

## EXTERNAL_ACTION_REQUIRED
NONE

---

## STOP

Wave 2 is complete with P1_OPEN = 0. Do **not** begin Wave 3 until instructed.
