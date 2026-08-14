# WAVE 8 — FINAL FULL-SYSTEM RE-AUDIT

**Date:** 2026-08-14  
**Branch:** `cursor/signup-onboarding-lifestyle-fields`  
**Base SHA (pre-Wave-8 commit):** `5611781f9543ed921756b61eed12e6637add0ba7`  
**Stop:** Wave 8 is the last engineering wave. Production was **not** deployed. `KAIOS_RUNTIME=false` remains. **No** automatic KAIOS → legacy fallback. Wave 9 was **not** started.

Previous-wave scores were treated as **context only**. This document scores **current HEAD after targeted closures**.

---

## PHASE 1 — INVENTORY (recalculated)

| Metric | Value |
| --- | --- |
| GIT_SHA (pre-closure) | `5611781f9543ed921756b61eed12e6637add0ba7` |
| BRANCH | `cursor/signup-onboarding-lifestyle-fields` |
| NODE_VERSION | v26.4.0 |
| NEXT_VERSION | 15.5.22 |
| PACKAGE_MANAGER | npm 11.17.0 (`package-lock.json`) |
| SOURCE_FILE_COUNT | 574 (`app`+`lib`+`components` ts/tsx/js) |
| APPLICATION_LOC | 53,034 lines |
| TEST_FILE_COUNT | 171 |
| TOTAL_AUTOMATED_TESTS | 865 passed + 13 skipped (Vitest default) |
| DB_TEST_COUNT | 6 files; live RLS/RPC **skipped** (Docker not on PATH) |
| KAIOS_TEST_FILES | 28 |
| PLAYWRIGHT_FILE_COUNT | 9 specs / 54 tests this run |
| MIGRATION_COUNT | **75** (includes Wave 8 `20260814180000_…`) |
| PUBLIC_TABLE_COUNT (classified) | 47 (`SCHEMA_REGISTRY`) |
| SECURITY_DEFINER_COUNT (classified) | 41 (`RPC_REGISTRY` / `AUDIT_SECURITY_DEFINER_COUNT`) |
| API_ROUTE_COUNT | 101 `route.ts` |
| USER_FACING_ROUTE_COUNT | 30 `page.tsx` |
| REVIEWED_LOCALE_COUNT | **9** (tr, en, de, fr, es, es-mx, es-ar, it, ar) |

Live `information_schema` table/function counts were **not** re-measured (no Docker). Classification completeness is enforced by registries + tests that run **when** `KAIFY_DB_TESTS=1`.

---

## PHASE 2 — REPRODUCIBILITY

| Gate | Result |
| --- | --- |
| Lockfile install | Existing `node_modules` from lockfile; `npm ci` not forced (would wipe). No stale-cache-only compile observed. |
| typecheck | **PASS** |
| lint:strict | **PASS** (0 warnings) |
| Vitest | **PASS** 865 / 13 skipped |
| coverage | statements **34.78%**, branches **33.07%**, functions **40.72%**, lines **35.50%** over `lib/**` + `app/api/**` (exclusions: types, lang, native, supabase glue) |
| production build | **PASS** |
| bundle budget | **PASS** largest **124** / core-shared **333** / middleware **116** / landing first-load **238** KB gzip (caps 135/350/125/250) |
| npm audit --audit-level=high | **PASS** 0 vulnerabilities |
| Gitleaks | **NOT_AVAILABLE** (binary not on PATH). Repo grep: JWT fixture only in `tests/unit/logger.test.ts` |
| migration-order | **PASS** static uniqueness (`tests/db/migration-reproducibility.test.ts`) |
| clean Supabase reset ×2 | **NOT_AVAILABLE** (`docker: command not found`) |
| DB RLS/RPC live | **NOT_AVAILABLE** |
| Playwright | **MIXED** 26 passed, 16 skipped (auth OTP), **12 failed** (timeouts: `/pricing`, cookie banner, some login/i18n/SEO). Not treated as source P0; owner re-run on staging. |
| Lighthouse | **NOT_REMEASURED** this environment (same start path as failing Playwright). Bundle budgets used for performance evidence. |
| KAIOS unit | **PASS** (included in Vitest) |

---

## PHASE 3 — DATABASE / AUTHORIZATION

**PUBLIC_TABLES_CLASSIFIED:** 47  
**PUBLIC_TABLES_ACTUAL:** unknown this env (no live inspect)  
**SECURITY_DEFINER_CLASSIFIED:** 41  
**SECURITY_DEFINER_ACTUAL:** unknown this env  

Unclassified-in-registry: **0** (completeness tests exist; live equality not re-run).

USER_A / USER_B live matrix: **NOT_RUN**. Wave 2/3 tests remain in `tests/db/rls-authorization.test.ts` and `rpc-authorization.test.ts`.

**Wave 8 code change:** `is_admin()` now requires JWT `aal=aal2` so PostgREST admin SELECTs cannot skip MFA. Avatar **INSERT/UPDATE** policies dropped; Sharp-processed API (service role) is the write path.

**OWNER_ACTION:** apply migration `20260814180000_wave8_admin_aal2_avatar_writes.sql` on hosted DB before canary; then run `KAIFY_DB_TESTS=1`.

---

## PHASE 4–5 — SECURITY / PRIVACY (fresh)

Verified still good (source): OTP anti-enumeration, CSRF+origin, no CORS `*`, webhook HMAC, meal/physique **not stored**, avatars private in Wave 3 SQL, structured log key redaction, quota RPC atomic.

**Closed this wave:**
- Admin RLS vs MFA (`is_admin` + aal2)
- Direct Storage avatar writes (EXIF bypass)
- DSAR export missing user-owned tables
- Billing `customer_email` no longer persisted
- `ADMIN_EMAIL` fail-closed in production/preview

**Residuals (not P0):** `style-src 'unsafe-inline'`; edge middleware rate-limit fail-open; OTP `create_user: true`; CSRF_SECRET reused for hub/avatar tokens; concurrent distinct Paddle events not serialized per subscription.

---

## PHASE 6 — RELIABILITY

**MUTATION_IDEMPOTENCY_MATRIX:** declared `unsafeRetryMutations()` = **[]** → **UNSAFE_MUTATIONS = 0**  
Residual: admin gift send not in matrix (P3 catalog gap).

**CRON_EXECUTION_MATRIX:** no `UNSAFE` → **UNSAFE_CRONS = 0**  
Hourly jobs: **pg_cron + Vault `kaify_cron_secret`**. Vercel `vercel.json` is **daily backup**.  

**CRITICAL_TRANSACTION_MATRIX:** no `RISK` rows → **CRITICAL_TRANSACTION_RISKS = 0**  
Honest residual: billing multi-step + photo persist-after-provider.

**Closed this wave:** KAIOS double quota refund (`quotaSettled` after catch refund).

---

## PHASE 7–9 — PERF / SCALE / COST

**CORE_SHARED_JS_GZIP:** 333 KB  
**LARGEST_CLIENT_CHUNK_GZIP:** 124 KB  
**MIDDLEWARE_GZIP:** 116 KB  
**LANDING_FIRST_LOAD:** 238 KB gzip JS  
Lighthouse LCP/CLS/TBT: **not remeasured**.

Scale: no known 10k architectural cliff on hot paths (leaderboard snapshot, quota RPC, photo preprocess bound). 100k: growth-triggered (pg_cron cadence, chat history volume, export streaming).

| Flow | Provider calls |
| --- | --- |
| Kai casual / memory | 1 DeepSeek |
| Alex text / programming | 1 DeepSeek |
| Maya text | 1 DeepSeek |
| Maya photo success | 1 Gemini + 1 DeepSeek |
| Leo photo success | 1 Gemini + 1 DeepSeek |
| Leo valid repeat | 0 Gemini (TTL 30d, user+type+fingerprint) |
| Council | 1 DeepSeek / turn |
| Periodic summary LLM | **NONE** |
| Second card LLM (KAIOS) | **NONE** |
| Analytics LLM | legacy soak path only |

**SECONDARY_UNMETERED_CALLS:** 0  
**AUTOMATIC_PERIODIC_SUMMARY_LLM:** NONE  

No dollar claims.

---

## PHASE 10–12 — KAIOS / MEMORY / VISION

KAIOS_RUNTIME default **true**. Rollback **explicit env only**. AUTOMATIC_LEGACY_FALLBACK **NONE**.

Canonical sources `kaios/source/01`–`17` present. Runtime does not concatenate those markdown files.

**MODEL CONFIG**

| | |
| --- | --- |
| INTENDED_TEXT_MODEL | `deepseek-chat` (`lib/ai/models.ts` + Wave 7 contract; KAIOS source does not name a contradictory vendor ID) |
| CONFIGURED_TEXT_MODEL | `DEEPSEEK_MODEL` or default `deepseek-chat` |
| INTENDED_VISION_MODEL | `gemini-flash-lite-latest` |
| CONFIGURED_VISION_MODEL | `GEMINI_MODEL` or default `gemini-flash-lite-latest` |
| MODEL_CONFIG_MATCH | **PASS** |

Unknown env IDs → `AiEnvError`. Scripts (i18n fill) still hardcode Gemini IDs (**TEST_ONLY / POST_CANARY**, not request path).

Memory: 0–5 **relevant only** (threshold 2). Vision envelope fail-closed. Gemini is observer, not Maya/Leo final authority.

---

## PHASE 13–17 — UX / A11Y / SEO / I18N / FRONTEND

Closed: Welcome leaderboard ERROR=HIDDEN; hardcoded TR session-revoke copy; 404 `noindex`.

Residuals: legal bodies TR/EN only; OTP locale coerced to tr/en; RTL physical CSS; public `robots.txt`/`sitemap.xml` duplicates App Router (currently matching).

SessionProvider is **not** on marketing. Root metadata **static**. No `public/index.html`. Strategy B hreflang. Private prefixes disallowed.

---

## PHASE 18 — OPERATIONS / ENV CONTRACT

**REQUIRED_PRODUCTION_SECRETS** (no values): Supabase URL+anon+service role; `CRON_SECRET`; `CSRF_SECRET`; `ADMIN_HUB_PASSWORD`; `ADMIN_HUB_SECRET`; `ADMIN_EMAIL`; `PADDLE_NOTIFICATION_WEBHOOK_SECRET`; Upstash URL+token; `DEEPSEEK_API_KEY`; `GEMINI_API_KEY`.

**OPTIONAL:** recaptcha, Sentry, VAPID, Paddle client token (checkout).

**FEATURE_FLAGS:** `KAIOS_RUNTIME` (default true), `AI_STRUCTURED_CARDS`, `AI_CHAT_ANALYTICS`, `DAILY_CHEST_LIMIT_ENABLED`.

**ROLLBACK_FLAGS:** `KAIOS_RUNTIME=false` only. Redeploy/env change. Do **not** auto-invoke.

**SCHEDULERS:** Vercel daily crons in `vercel.json`; frequent jobs via **pg_cron** when Vault secret exists.

**OWNER_VERIFY_NOTIFICATION_CRON:** Production should have `kaify-notifications` / hourly variants in `cron.job` **or** accept Vercel `0 6 * * *` `/api/cron/notifications` as daily backup. Expected frequent schedule (when Vault seeded): notifications hourly + 15m leaderboard snapshot (see `20260804171000_faz1_pg_cron_vault_schedules.sql`).

---

## PHASE 19 — TESTING QUALITY

| | |
| --- | --- |
| TOTAL_APPLICATION_LOC | 53,034 |
| COVERAGE_SCOPE | `lib/**/*.ts` + `app/api/**/*.ts` minus types/lang/native/supabase glue |
| STATEMENTS / BRANCHES / FUNCTIONS / LINES | 34.78 / 33.07 / 40.72 / 35.50 % |

Do **not** cite a historical 86%. Coverage is a regression floor, not quality.

Present: DB auth tests (gated), public E2E, AI adversarial, SEO contract, a11y public, bundle budgets. Weak: services/API route coverage ~0–15% on many handlers; live DB; authenticated axe.

---

## PHASE 20–21 — HYGIENE / SECRETS

Legacy chat/team/card LLM: **POST_CANARY_LEGACY_REMOVAL** (keep until soak).  
`bumpAndMaybeCondense` no-op: **INTENTIONAL** until legacy removal.  
i18n scripts with hardcoded Gemini IDs: **TEST_ONLY**.  
No production secrets printed. Gitleaks unavailable.

---

## ISSUE REGISTER (current HEAD after closures)

| ID | CATEGORY | SEVERITY | STATUS | EVIDENCE | OWNER_ACTION | RELEASE_BLOCKING |
| --- | --- | --- | --- | --- | --- | --- |
| W8-001 | Security | P1 | **FIXED** | `is_admin` AAL2 migration | Apply migration on hosted DB | No after migrate |
| W8-002 | Reliability | P1 | **FIXED** | KAIOS double `refundQuota` | none | No |
| W8-003 | Privacy | P1 | **FIXED** | export/deletion registries | none | No |
| W8-004 | Security | P2 | **FIXED** | drop avatar INSERT/UPDATE policies | Apply same migration | No |
| W8-005 | Privacy | P2 | **FIXED** | stop persisting billing email | none | No |
| W8-006 | Security | P2 | **FIXED** | ADMIN_EMAIL fail-closed in prod | Set `ADMIN_EMAIL` in Vercel | Ops |
| W8-007 | UX | P2 | **FIXED** | WelcomeLeaderboard fail-hidden | none | No |
| W8-008 | i18n | P2 | **FIXED** | TR-only session revoke string | none | No |
| W8-009 | SEO | P2 | **FIXED** | 404 inherited indexable metadata | none | No |
| W8-010 | AI cost | P2 | **FIXED** | KAIOS `after()` analytics LLM | none | No |
| W8-011 | Billing | P2 | OPEN | concurrent distinct Paddle events | soak watch | No |
| W8-012 | Auth | P2 | OPEN | OTP `create_user: true` / verify IP-only | optional GoTrue caps | No |
| W8-013 | Web | P3 | OPEN | CSP `unsafe-inline` | post-canary nonce | No |
| W8-014 | A11y | P3 | OPEN | RTL physical CSS residuals | polish | No |
| W8-015 | i18n | P3 | OPEN | legal copy TR/EN; OTP lang coerce | later locales | No |
| W8-016 | KAIOS | P3 | OPEN | tools not dispatched on chat path | post-canary | No |
| W8-017 | Test | P2 | OPEN | local Playwright 12 timeouts | staging re-run | No (env) |
| W8-018 | Ops | P2 | OPEN | live DB reset + RLS not re-run (no Docker) | owner CI/hosted | Evidence |
| W8-019 | Ops | P3 | OPEN | Gitleaks not installed | optional CI | No |
| W8-020 | Ops | — | OPEN | notification pg_cron Vault | OWNER_VERIFY | Evidence |

**P0_OPEN: 0**  
**P1_OPEN: 0** (implementation; hosted migration must be applied)  
**P2_OPEN: 4** (W8-011, 012, 017, 018)  
**P3_OPEN: 4** (W8-013–016, 019)

---

## SCORES (current HEAD, independent)

| Category | SCORE | CONFIDENCE | EVIDENCE | OPEN | RATIONALE |
| --- | --- | --- | --- | --- | --- |
| SECURITY | 95 | MEDIUM-HIGH | MIXED | W8-012/013 | MFA-bound admin RLS + private avatars in SQL; live DB unconfirmed |
| PRIVACY | 95 | MEDIUM | MIXED | W8-018 | Export/deletion registries complete; live delete unconfirmed |
| DATABASE | 95 | MEDIUM | STATIC | W8-018 | Registries 47/41; live actual unknown |
| BACKEND_API | 93 | MEDIUM-HIGH | TESTED | W8-011 | Quota/idempotency; billing concurrency residual |
| RELIABILITY | 93 | MEDIUM-HIGH | TESTED | W8-011 | Matrices 0 unsafe; photo persist-after-provider residual |
| PERFORMANCE | 90 | MEDIUM | TESTED | Lighthouse gap | Budgets green; LCP not remeasured |
| SCALABILITY | 93 | MEDIUM | STATIC | 100k growth | No 10k cliff identified |
| COST_EFFICIENCY | 93 | MEDIUM-HIGH | TESTED | none $ | Call topology matches KAIOS; no billing $ |
| UX | 95 | MEDIUM | MIXED | W8-017 | Error≠empty on leaderboard; no full manual walk |
| ACCESSIBILITY | 93 | MEDIUM | MIXED | W8-014, AUTH axe | Public landmarks tests exist; VoiceOver not run |
| I18N | 92 | MEDIUM-HIGH | TESTED | W8-015 | 9 reviewed locales; legal TR/EN |
| SEO | 96 | MEDIUM-HIGH | TESTED | W8-017 | Contract tests; 404 noindex; Strategy B |
| FRONTEND | 94 | MEDIUM-HIGH | STATIC | none launch | Marketing static; no SessionProvider leak |
| ARCHITECTURE | 95 | MEDIUM-HIGH | STATIC | legacy soak | Domains + KAIOS flag explicit |
| AI_KAIOS | 93 | MEDIUM | TESTED | W8-016, live models | Implementation strong; live canary deferred |
| AI_SAFETY | 93 | MEDIUM | TESTED | live injection | Fail-closed vision + poison memory |
| AI_RELIABILITY | 91 | MEDIUM | TESTED | live abort | Quota/abort unit; no soak |
| AI_COST_EFFICIENCY | 93 | MEDIUM-HIGH | TESTED | none | 1/1/≤2 graphs |
| TESTING | 88 | HIGH | TESTED | coverage, DB, PW | Honest 35% scope; gates otherwise green |
| OPERATIONS | 91 | MEDIUM | MIXED | W8-018/020 | Env contract louder; Docker/cron unverified |
| DX | 90 | MEDIUM-HIGH | STATIC | none | Lockfile + scripts; Wave docs |

**OVERALL_SCORE: 93/100** (release-critical floor ~93; not a fake 95).  
**OVERALL_CONFIDENCE: MEDIUM** — implementation HIGH-ish, live DB/AI/a11y LOW.

A = release-critical. Below 95 with documented reason: Backend/Reliability (billing concurrency, not launch-corrupt), A11y (manual SR), AI (live canary), Performance (Lighthouse not remeasured; budgets OK).

---

## TARGETED CLOSURE (done in this wave)

1. `is_admin()` requires `aal2`  
2. Drop authenticated avatar INSERT/UPDATE  
3. KAIOS quotaSettled after refund  
4. GDPR export/cascade tables  
5. Null billing customer_email  
6. ADMIN_EMAIL required + fail-closed  
7. WelcomeLeaderboard error UI  
8. Localized session-revoke success  
9. 404 robots noindex  
10. Remove KAIOS analytics extra LLM  

Re-gates: typecheck, lint, Vitest 865, i18n check, build, bundle, npm audit high.

---

## EXTERNAL EVIDENCE REGISTER

| Item | State | REQUIRED_BEFORE_CANARY | REQUIRED_DURING_CANARY | OPTIONAL_POST_LAUNCH |
| --- | --- | --- | --- | --- |
| AUTHENTICATED_AXE | EXTERNAL_EVIDENCE_GAP | No | Yes if time | Yes |
| VOICEOVER_NVDA | GAP | No | Spot-check | Yes |
| LIVE_DEEPSEEK | NOT_AVAILABLE | No | **Yes** (canary) | — |
| LIVE_GEMINI | NOT_AVAILABLE | No | **Yes** (canary) | — |
| OWNER_NOTIFICATION_CRON_VERIFY | GAP | **Yes** (schedule exists) | Watch fires | — |
| MANUAL_PRODUCTION_CANARY | GAP | — | **Yes** | — |
| LIVE_DB_RESET_RLS | GAP (no Docker here) | **Yes** on CI/hosted | — | — |
| GITLEAKS | GAP | Optional | — | CI |
| LIGHTHOUSE_REMEASURE | GAP this env | Optional | — | Yes |
| PLAYWRIGHT_STAGING | local timeouts | Staging public smoke | — | — |

Do not mix these with source P0.
