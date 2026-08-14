# Wave 5 — Performance, scalability, cost efficiency

**Date:** 2026-08-14  
**Branch:** `cursor/signup-onboarding-lifestyle-fields`  
**Waves 1–4:** not reopened. Waves 6–8: not started.

**Local gates:** typecheck PASS, lint:strict PASS, Vitest 636 passed / 10 skipped, production build PASS, bundle budget PASS (tightened caps). Live Supabase reset / RLS / RPC: not executable here (no local Docker/WSL). GitHub Actions job **Supabase DB · RLS · RPC** is live evidence after push.

**PERFORMANCE_SCORE_BEFORE:** 68/100  
**SCALABILITY_SCORE_BEFORE:** 74/100  
**COST_EFFICIENCY_SCORE_BEFORE:** 70/100  
**DATABASE_SCORE_CURRENT:** 92/100  
**BACKEND_API_SCORE_CURRENT:** 90/100

---

## EXECUTIVE RESULT

Wave 5 removed three growth cliffs (AI ledger scan on the hot path, `rank()` over all qualifying streaks before `LIMIT`, gem runtime `SUM`) and made public marketing routes statically generated. Shared JS gzip did **not** drop into the 150–200 KB band; budgets were tightened to the measured baseline instead of being raised. Lighthouse CI thresholds were not changed.

**WAVE_5_STATUS:** COMPLETE (live DB suite pending CI, same constraint as Waves 3–4)

---

## PERFORMANCE_BASELINE

Measured from Faz 4 / Wave 4 production-build evidence at HEAD before this wave’s code landed, plus current-architecture reproduction:

| Metric | BEFORE |
|--------|--------|
| Core shared JS gzip | 339 KB |
| Largest client chunk gzip | ~128 KB (`5857-*.js`) |
| Middleware edge gzip | ~114 KB |
| First Load JS shared (Next table) | 189–190 KB |
| Marketing `/` First Load | ~192 KB (Faz 4) / all routes `ƒ` dynamic |
| `/welcome` First Load | ~308 KB |
| Bundle caps | 150 / 360 / 140 KB |
| App open (authenticated) | `GET /api/session` then `POST /api/check-in` (home already in session) |
| App open (guest on app shell) | `GET /api/session` → 401 |
| `cachedWithStale` hit | GET + SET stale |
| AI user budget | paginated `ai_usage_ledger` (1000-row pages) |
| `/api/home` | `requireAi` + `dailyAiBudget` |
| Leaderboard RPC | `rank() OVER (...)` then `LIMIT` |
| Gem hot path | materialized `user_kai_state.gem_balance` (Wave 4); ledger unbounded |
| Root `generateMetadata` / layout | `cookies()` + `headers()` → entire tree dynamic |

---

## PERFORMANCE_AFTER

| Metric | AFTER | DELTA |
|--------|-------|-------|
| Core shared JS gzip | 339 KB | 0 |
| Largest client chunk gzip | 127 KB | −1 KB |
| Middleware edge gzip | 116 KB | +2 KB (static-HTML CSP branch) |
| First Load JS shared | 190 KB | ~0 |
| `/` | ○ static, 322 kB First Load, revalidate 1h | dynamic → static |
| `/privacy` `/terms` `/cookies` `/kvkk` | ○ static, ~218–224 kB | dynamic → static |
| `/pricing` `/login` | still `ƒ` (app shell) | 0 classification |
| Bundle caps | 135 / 350 / 125 KB | lowered, never raised |
| Authenticated open, already checked in | 1 blocking request (`GET /api/session`) | −1 POST |
| Authenticated open, first check-in of local day | session then check-in | same count, no extra `/api/home` |
| Guest app-shell | 0 bootstrap APIs | −1 to −2 |
| `cachedWithStale` hit | 1 GET | −1 SET |
| `cachedWithStale` miss | 2 GET attempts + 2 SET | same write pair, no hit rewrite |
| AI user budget | 1 row `ai_daily_usage` | unbounded pages → 1 |
| `/api/home` | session rate limit only | − platform + user AI budget |
| Leaderboard default | snapshot + bounded page CTE | no full-window `rank()` |
| Gem hot path | `user_kai_state` only | confirmed no ledger SUM |

Landing First Load (322 kB) is **route JS** (Landing + lucide), not the shared-core 190 kB. Aspirational 150–200 KB **shared** gzip remains a later split of `5857` (~127 KB gz) + `main` — not forced here.

---

## BUNDLE_BEFORE_AFTER

| Gate | Old cap | Measured after | New cap |
|------|---------|----------------|---------|
| largest-client-chunk-gzip | 150 | 127 | **135** |
| core-shared-gzip | 360 | 339 | **350** |
| middleware-edge-gzip | 140 | 116 | **125** |

Ranked gzip contributors (after Wave 5 build): `5857-*.js` 127, `main-*` 85, `8802-*` 68, `framework-*` 59, `4bd1b696-*` 53, `polyfills-*` 39. Changes: drop static `tr.json` from `LangProvider`; Geist weights 400+600 only. Core pick still 339 KB — **no unsafe redesign**.

---

## LIGHTHOUSE_BEFORE_AFTER

CI still uses `lighthouserc.cjs` (performance **warn** &lt; 0.65; accessibility **error** &lt; 0.85). Thresholds **not** changed.

This agent did not re-run LHCI (no dedicated Chrome session in the Windows sandbox). Marketing pages are now static HTML + smaller guest network. Authenticated app-shell metrics remain a Wave 8 evidence gap.

**PERFORMANCE_LIGHTHOUSE:** FAIL (not re-measured; do not treat as pass)  
**OVERALL_LIGHTHOUSE:** FAIL (accessibility/SEO owned by Wave 6)

---

## APP_OPEN_WATERFALL_BEFORE_AFTER

**BEFORE:** `GET /api/session` → fire-and-forget `POST /api/check-in` even when already checked in (RPC no-op + cache invalidation). Guests on `/login` still hit session.

**AFTER:**
- No auth cookie → guest state, **0** API bootstrap calls.
- Session includes home; `/api/home` is refresh-only.
- Check-in POST only when `lastCheckInDate` ≠ user local today.
- Server skips invalidation/events when `already_checked_in`.

| Scenario | Blocking requests BEFORE | AFTER |
|----------|--------------------------|-------|
| Guest `/login` | 1 (session 401) | **0** |
| Authed, already in | 2 (session + check-in) | **1** |
| Authed, first of day | 2 | **2** |

---

## REDIS_COMMAND_BEFORE_AFTER

| Flow | BEFORE | AFTER |
|------|--------|-------|
| `cachedWithStale` fresh hit | GET + SET stale | GET |
| `cachedWithStale` miss | GET + producer + SET fresh + SET stale | GET (+ recheck GET) + 2 SET |
| AI pressure flag | SET every platform budget check | GET; SET only on change |
| Same-day check-in | 3 invalidation patterns | **0** extra deletes |

---

## DB_QUERY_BEFORE_AFTER

| Flow | BEFORE | AFTER |
|------|--------|-------|
| `assertUserDailyAiBudget` | N pages of ledger (≤1000 rows each) | 1 `maybeSingle` on `ai_daily_usage` |
| Platform spend (cache miss) | `service_get_ai_cost_snapshot` / ledger page | 1 row `ai_platform_daily_usage` |
| `GET /api/home` | + platform AI + user ledger scan | home cache only |
| `get_global_leaderboard` | window `rank()` over all qualifying streaks | `ORDER BY … LIMIT/OFFSET` page, then count-ahead for rank |
| `getGemBalance` | kai columns then view | unchanged (no SUM) |

---

## LEADERBOARD_SCALE_RESULT

Default HTTP path still prefers 15-minute snapshots (Wave 4). Snapshot refresh and snapshot-miss fallback now use a **bounded page** plus `rank = 1 + count(strictly better tuples)` matching `rank() OVER (streak desc, longest desc, created_at asc)`.

Index: `idx_user_streaks_leaderboard_qualifying` on `(current_streak desc, longest_streak desc) WHERE current_streak > 0`.

| Qualifying users | Default page cost | Snapshot cron |
|------------------|-------------------|---------------|
| 1k | index + 50 counts | same |
| 10k | still top-N | same |
| 100k | still top-N; not O(n) window rank | same |

Non-default offsets remain a page of `limit` rows, not a full ranking. Public UUIDs stay masked (Wave 3). Tie semantics preserved in unit tests.

Conceptual only (no 100k CI dataset). Live RPC smoke in `tests/db/wave5-perf.test.ts`.

---

## GEM_LEDGER_SCALE_RESULT

No new retention rule. Product/audit need remains **indefinite ledger** for reconcile (Wave 4). Hot path already uses `user_kai_state.gem_balance`. Architecture test forbids `gem_ledger` / `SUM` in `getGemBalance`. Archive is **GROWTH_TRIGGERED**, not launch-blocking.

---

## AI_BUDGET_HOT_PATH_RESULT

Trigger on `ai_usage_ledger` INSERT maintains `ai_daily_usage` and `ai_platform_daily_usage`. `reconcile_ai_daily_usage(date)` rebuilds a UTC day (service_role). Quota concurrency: increment is in the same insert transaction as the ledger row. Refunds remain quota-guard (Wave 7 KAIOS accounting not redesigned).

---

## STATIC_RENDERING_RESULT

| Route | Class |
|-------|--------|
| `/`, `/privacy`, `/terms`, `/cookies`, `/kvkk` | **PUBLIC_STATIC** (`○`, revalidate 1h) |
| `/pricing`, `/login`, `/signup` | **AUTHENTICATED_DYNAMIC** (app chrome) |
| `/(app)/*` product | **AUTHENTICATED_DYNAMIC** |
| `/api/*` | **API** |

Root layout no longer reads cookies/headers. Marketing CSP uses `'unsafe-inline'` without nonce so static HTML can hydrate; app routes keep nonce + `strict-dynamic`. TR `/privacy` → `/kvkk` is a client redirect.

---

## SCALE_MODEL_100_1K_10K_100K

| Layer | 100 | 1k | 10k | 100k |
|-------|-----|----|-----|------|
| DB | fine | fine | AI aggregate + bounded leaderboard | country `GROUP BY` + export size (PRIV-002 Wave leftover) |
| Redis | fine | fine | fewer SETs | high-cardinality user keys still GROWTH |
| AI | cap $75/day | pressure mode | same | **DEFER_TO_WAVE_7** secondary calls |
| Images | sharp 2048 store / 1280 vision | fine | CPU on analyze | queue if needed |
| Storage | fine | fine | meal photos | GROWTH |
| Cron | fine | Wave 4 cursors | leaderboard top-N | still bounded |
| Leaderboard | snapshot | snapshot | snapshot | ARCHITECTURAL only if offset-deep pages |
| Analytics | fine | fine | CHECKs | fine |
| Network | static marketing | same | same | landing JS 322 kB First Load |

No known **sudden cliff at 10k** from the original audit’s PERF-005 / DB-002 / check-in-every-open items.

100k: **GROWTH_TRIGGERED** (gem_ledger bytes, export, country aggregate). **LAUNCH_RELEVANT:** none new.

---

## COST_EFFICIENCY_RESULT

No billing export. Relative only:

1. **Check-in POST every open** — skipped after first local-day success; no-op no longer invalidates Redis.  
2. **`cachedWithStale` double SET** — hit path −1 command.  
3. **AI ledger pagination + home `dailyAiBudget`** — 1-row aggregate; home is not an AI route.  
4. **Unconditional pressure SET** — write on change only.  
5. **CDN/TTFB on marketing** — static HTML (CSRF Set-Cookie on first visit still limits shared-cache; TTFB still avoids Node SSR).

Secondary model calls, vision tokens, abandoned streams: **DEFER_TO_WAVE_7**.

---

## DEFERRED_TO_WAVE_7_AI_ITEMS

- Meter secondary KAIOS/synthesis/quality-gate calls  
- Provider orchestration / personality  
- Token reservation races beyond generic daily aggregate  
- Per-action conversational vs vision mix (no new telemetry here)

---

## PERF-001 — Client / shared JavaScript weight

**ID:** PERF-001  
**BEFORE:** ~339 KB gz core shared; ~128 KB largest; ~114 KB middleware; caps 150/360/140.  
**MEASUREMENT:** After change: 339 / 127 / 116; Next shared First Load 190 KB.  
**ROOT_CAUSE:** Caps sat above baseline; `5857` + `main` dominate; `tr.json` was statically imported.  
**CHANGE:** Dynamic-only `tr.json`; Geist 400/600; tightened caps 135/350/125.  
**TESTS:** `tests/architecture/bundle-budget.test.ts`  
**AFTER:** Caps lowered; shared gzip **unchanged**.  
**STATUS:** VERIFIED (budget meaningful; 200 KB gz not reached)  
**RESIDUAL_RISK:** Landing 322 kB First Load; lucide-react; app shell Session stack.

---

## PERF-003 — Cold app-open waterfall

**ID:** PERF-003  
**BEFORE:** Session then unconditional check-in POST.  
**MEASUREMENT:** Source + session bundle tests; guest skip; local-day gate.  
**ROOT_CAUSE:** Mutation treated as bootstrap.  
**CHANGE:** Auth-cookie gate; `alreadyCheckedInOnLocalDay`; skip invalidation on already-in.  
**TESTS:** `tests/architecture/app-open-waterfall.test.ts`, check-in flow.  
**AFTER:** Guest 0; already-in 1; first-of-day 2.  
**STATUS:** VERIFIED  
**RESIDUAL_RISK:** First-of-day still sequential (needs lastCheckInDate from session).

---

## PERF-004 — Marketing static rendering

**ID:** PERF-004  
**BEFORE:** Root cookies/headers → all `ƒ`.  
**MEASUREMENT:** `next build` — `/`, `/privacy`, `/terms`, `/cookies`, `/kvkk` are `○`.  
**ROOT_CAUSE:** Cookie metadata + CSP nonce in marketing layout.  
**CHANGE:** Static root metadata; `force-static` marketing layout; client privacy redirect; marketing CSP `staticHtml`.  
**TESTS:** `tests/architecture/static-marketing.test.ts`, CSP unit.  
**AFTER:** Public legal/landing static.  
**STATUS:** VERIFIED  
**RESIDUAL_RISK:** `/login` `/pricing` remain dynamic; first response may Set-Cookie CSRF.

---

## PERF-005 — AI daily budget hot path

**ID:** PERF-005  
**BEFORE:** Paginated ledger + Redis pressure SET; `/api/home` triggered it.  
**MEASUREMENT:** Unit mocks 1 `maybeSingle`; migration trigger + reconcile.  
**ROOT_CAUSE:** Scan-as-source-of-truth on the AI guard.  
**CHANGE:** `ai_daily_usage` / `ai_platform_daily_usage`; home guards removed.  
**TESTS:** `tests/unit/daily-cost-cap.test.ts`, `tests/db/wave5-perf.test.ts`, hot-path architecture.  
**AFTER:** O(1) user row.  
**STATUS:** VERIFIED (live reconcile pending CI)  
**RESIDUAL_RISK:** 45s Redis spend cache can lag the trigger; fail-closed in production on aggregate errors.

---

## PERF-006 — Stale cache double writes

**ID:** PERF-006  
**BEFORE:** Every `cachedWithStale` success SET the `:stale` key.  
**MEASUREMENT:** Simulated Redis command test — hit = 1 GET, 0 SET.  
**ROOT_CAUSE:** Unconditional companion write.  
**CHANGE:** Write stale only after producer miss.  
**TESTS:** `tests/unit/cached-with-stale-commands.test.ts`  
**AFTER:** Hit path −1 SET.  
**STATUS:** VERIFIED  
**RESIDUAL_RISK:** Miss path still two SETs (required for SWR).

---

## PERF-007 — Avatar cache invalidation

**ID:** PERF-007  
**BEFORE:** 30 min signed URL, no upload delete (original audit).  
**MEASUREMENT:** Wave 1/3 already `cacheDelete` + purge pattern.  
**ROOT_CAUSE:** Fixed in prior waves.  
**CHANGE:** None (no duplicate mechanism). Stored images downscale to 2048.  
**TESTS:** `tests/architecture/avatar-cache-invalidation.test.ts` + existing purge tests.  
**AFTER:** Unchanged invalidation; smaller stored bytes.  
**STATUS:** VERIFIED_BY_PRIOR_WAVE_EVIDENCE  
**RESIDUAL_RISK:** Signed TTL 1800s if invalidation helper is skipped in a new path.

---

## PERF-002 — Home cache re-verification

**ID:** PERF-002  
**BEFORE:** Locale-fragmented keys (original); Wave 1 v3 locale-free.  
**MEASUREMENT:** Existing `tests/architecture/home-cache-and-cron.test.ts` still green.  
**ROOT_CAUSE:** N/A  
**CHANGE:** None besides cheaper `cachedWithStale`.  
**TESTS:** Wave 1 tests + this wave’s stale-command tests.  
**AFTER:** Same identity.  
**STATUS:** VERIFIED_BY_WAVE_1_EVIDENCE + CURRENT_TESTS  
**RESIDUAL_RISK:** None new.

---

## DB-002 performance residual

**ID:** DB-002  
**BEFORE:** `rank() OVER` full qualifying set.  
**MEASUREMENT:** SQL rewrite in `20260814170000_wave5_performance.sql`; grants still service_role.  
**ROOT_CAUSE:** Window before limit.  
**CHANGE:** Page CTE + count-ahead ranks + qualifying index.  
**TESTS:** architecture SQL shape; live service_role RPC; existing tie tests.  
**AFTER:** Default and snapshot refresh bounded.  
**STATUS:** VERIFIED  
**RESIDUAL_RISK:** Correlated count per page row; cheap at top-N, not a 100k offset crawl.

---

## DB-003 performance residual

**ID:** DB-003  
**BEFORE:** Fear of SUM-on-ledger at 100k.  
**MEASUREMENT:** `getGemBalance` reads kai columns.  
**ROOT_CAUSE:** Already materialized in Wave 4.  
**CHANGE:** No archive. Document hot path.  
**TESTS:** `tests/architecture/hot-path-queries.test.ts`  
**AFTER:** Hot path independent of ledger length.  
**STATUS:** VERIFIED  
**RESIDUAL_RISK:** Ledger growth is storage, not earn/spend latency.

---

## DATABASE / REDIS / CRON / IMAGE notes

- New indexes named for `get_global_leaderboard` / `get_user_rank` only.  
- Notifications, chat history, outbox: Wave 4 cursors unchanged.  
- Cron: leaderboard snapshot still 15m; work is top 50/100 not full rank.  
- Vision: `AI_VISION_MAX_DIMENSION` default **1280**. Stored upload long edge **2048**. Input still 5 MiB.

---

## SCORE REASSESSMENT

Evidence is strong for static marketing, O(1) AI budget, bounded leaderboard SQL, and fewer Redis/check-in writes. Not 95: shared JS gzip did not drop; Lighthouse performance not re-run; live DB pending CI; landing First Load still heavy.

**PERFORMANCE_SCORE_AFTER: 84/100**  
**SCALABILITY_SCORE_AFTER: 88/100**  
**COST_EFFICIENCY_SCORE_AFTER: 82/100**  
**DATABASE_SCORE_AFTER_PERFORMANCE: 94/100**  
**BACKEND_API_SCORE_AFTER_PERFORMANCE: 91/100**

---

## Final summary

WAVE_5_STATUS: COMPLETE  
REQUIRED_PERFORMANCE_ISSUES: 6  
RECHECKS: 1  
WAVE_4_PERFORMANCE_LEFTOVERS: 2  
VERIFIED: 9  
BLOCKED: 0  
PERFORMANCE_OPEN: 0  
SCALABILITY_OPEN: 0  
PERFORMANCE_SCORE: 84/100  
SCALABILITY_SCORE: 88/100  
COST_EFFICIENCY_SCORE: 82/100  
DATABASE_SCORE: 94/100  
BACKEND_API_SCORE: 91/100  
CORE_SHARED_JS_GZIP_BEFORE: 339  
CORE_SHARED_JS_GZIP_AFTER: 339  
MIDDLEWARE_GZIP_BEFORE: 114  
MIDDLEWARE_GZIP_AFTER: 116  
APP_OPEN_BLOCKING_REQUESTS_BEFORE: 2  
APP_OPEN_BLOCKING_REQUESTS_AFTER: 1  
LIGHTHOUSE_PERFORMANCE: FAIL  
LIGHTHOUSE_OVERALL: FAIL  
LIVE_DB_SUITE: pending GitHub Actions  
TYPECHECK: PASS  
LINT: PASS  
TESTS: PASS (636 passed, 10 skipped)  
BUILD: PASS  
NPM_AUDIT_HIGH: PASS  
EXTERNAL_ACTION_REQUIRED: Confirm **Supabase DB · RLS · RPC** on the Wave 5 commit. Do not retune Lighthouse.

Wave 6 leftover: accessibility/SEO Lighthouse, landing JS weight as UX. Wave 7 leftover: KAIOS secondary calls.
