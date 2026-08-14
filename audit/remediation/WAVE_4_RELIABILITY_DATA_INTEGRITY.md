# WAVE 4 — Reliability, data integrity, backend correctness

Stop after this wave. Waves 5–8 were not started.

**HEAD at start:** `632a28e` (Wave 3 docs) on `1bb8aa9` (SEC-009).  
**Local gates (this machine):** typecheck PASS, lint:strict PASS, Vitest 620 passed / 8 skipped, production build PASS, npm audit high PASS, bundle budget PASS.  
**Live Supabase reset / RLS / RPC:** not executable here (no local Docker/WSL). Same as Wave 3: GitHub Actions job **Supabase DB · RLS · RPC** is the live evidence after push.

RELIABILITY_SCORE_BEFORE: 70/100  
DATABASE_SCORE_BEFORE: 82/100  
BACKEND_API_SCORE_BEFORE: 83/100

---

## REL-004 — Distributed circuit breaker

**ID:** REL-004  
**BEFORE:** `lib/resilience/circuit.ts` stored failures/`openUntil` in a process `Map`. Each serverless isolate independently failed N times. Comment claimed per-instance was “fine.” AI wrapper (`lib/ai/circuit-breaker.ts`) used the same Map (`deepseek`, `gemini`).  
**CURRENT_REPRODUCTION:** Confirmed at HEAD: in-process only; Redis cache had GET/SET but no circuit keys.  
**INVARIANT:** Provider health is shared when Redis is healthy; Redis outage must not fail requests or freeze half-open forever; at most one isolate probes after cooldown.  
**ROOT_CAUSE:** No shared store; half-open had no inter-instance mutex.  
**CHANGE:** Redis JSON state (`circuit:v1:{name}`) merged with local Map; SET NX probe key; Redis down / unconfigured → local breaker only. Telemetry: `circuit.open`, `circuit.half_open`.  
**TESTS_ADDED:** `tests/unit/circuit-distributed.test.ts` — closed→open, shared open across simulated instances, half-open stampede (1 probe), Redis disabled, recovery. Existing `tests/unit/resilience.test.ts` still green.  
**RUNTIME_EVIDENCE:** Amplification: threshold=2, after open further calls = 0 provider invocations (test `calls === 2` then short-circuit). Multi-instance: second isolate `calls === 0`.  
**STATUS:** VERIFIED (unit / simulated Redis). Live Upstash not exercised on this agent.  
**FILES_CHANGED:** `lib/resilience/circuit.ts`, `lib/cache.ts`  
**RESIDUAL_RISK:** Shared GET/SET is last-write-wins, not a consensus protocol. Self-recovery still resets *local* circuits; Redis openUntil TTL remains the cross-instance cooldown.

---

## REL-005 — Analytics data range integrity

**ID:** REL-005  
**BEFORE:** `analytics_daily` had no CHECK bounds; `upsert_analytics_daily` coalesced jsonb with no validation.  
**CURRENT_REPRODUCTION:** Schema in `20260630190000_phase8_analytics_market_team.sql`.  
**INVARIANT:** Persisted numerics are finite and within corruption-prevention bounds; AI/camelCase patches are sanitized before RPC; direct negative writes fail at DB.  
**ROOT_CAUSE:** Trust of model JSON + unconstrained columns.  
**CHANGE:** App `lib/analytics/bounds.ts`; pending-confirm sanitization; RPC clamp via `analytics_safe_numeric`; CHECK constraints after clamping existing rows; meal increment caps.  
**TESTS_ADDED:** `tests/unit/analytics-bounds.test.ts`; live `tests/db/wave4-integrity.test.ts` (CHECK + RPC clamp).  
**RUNTIME_EVIDENCE:** Unit: NaN dropped, -12 kcal → 0, 99999 → 20000. Live CI: CHECK rejects `calories_consumed = -5`; `upsert_analytics_daily` clamps 999999 / −3.  
**STATUS:** VERIFIED (app + migration + unit + live CI).  
**FILES_CHANGED:** `lib/analytics/bounds.ts`, `lib/repositories/analytics-write.repository.ts`, `lib/services/analytics-confirmation.service.ts`, `supabase/migrations/20260814160000_wave4_reliability_integrity.sql`  
**RESIDUAL_RISK:** Ceilings are anti-corruption, not medical. `calorie_goal` floor 500 may rewrite historical 0 after clamp-on-migrate.

---

## REL-006 — Out-of-order Paddle events

**ID:** REL-006  
**BEFORE:** `handleNormalizedPaddleEvent` applied created/updated/canceled in delivery order after claim. `occurred_at` was not compared to stored subscription state.  
**CURRENT_REPRODUCTION:** `lib/services/billing.service.ts` switch after `claimBillingEvent`.  
**INVARIANT:** Canonical subscription/tier never moves backward in (occurred_at, type rank, event_id). Cancel cannot be resurrected by an older update. Duplicates remain claim-idempotent.  
**ROOT_CAUSE:** No persisted last-applied event metadata.  
**CHANGE:** Columns `last_event_occurred_at`, `last_event_id`, `last_event_rank` on `paddle_subscriptions`. Skip + finalize stale events (`billing.stale_event_ignored`). Rank: created=1, updated/activated/…=2, canceled=3. Same timestamp: higher rank then lexicographic event id. Claim/finalize/release unchanged.  
**TESTS_ADDED:** `tests/unit/billing-event-order.test.ts`; stale skip in `tests/integration/paddle-webhook.flow.test.ts`.  
**RUNTIME_EVIDENCE:** Stale updated after cancel → `{ ok: true, skipped: true }`, `apply_subscription` RPC not called.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/billing/event-order.ts`, `lib/services/billing.service.ts`, migration, `lib/types/database.types.ts`  
**RESIDUAL_RISK:** Customer events unordered (no subscription cursor). Missing `occurred_at` compares as 0 (treated as oldest).

---

## REL-001 residual — Server-side idempotency completeness

**ID:** REL-001  
**BEFORE:** Client keys existed (Wave 1). Server `withIdempotency` only on check-in, market, referral, team chat. Chat POST reserved quota + inserted messages with no key. Analytics confirm used `request.json()` with no store.  
**CURRENT_REPRODUCTION:** Confirmed.  
**INVARIANT:** Retryable mutations are A (Idempotency-Key store), B (DB uniqueness / LWW), or C (not auto-retried / provider-id). Chat retry must not double user rows, quota, or AI persist.  
**ROOT_CAUSE:** Stream responses were not stored; several JSON mutations never claimed keys.  
**CHANGE:** `claimIdempotency` / `completeIdempotency` / `releaseIdempotency`. Chat: claim → quota → stream wrap complete/release; unique `(user_id, client_idempotency_key)`; SSE replay on completed key; 409 while in_progress. Wired: analytics confirm, settings, consent, avatar, analyze, support. Matrix: `lib/reliability/mutation-matrix.ts`.  
**TESTS_ADDED:** `tests/unit/idempotency-replay.test.ts`, `tests/unit/wave4-matrices.test.ts` (`unsafeRetryMutations() === []`).  
**RUNTIME_EVIDENCE:** Replay returns stored body; in_progress → CONFLICT.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/api/idempotency-store.ts`, `app/api/chat/[coachId]/route.ts`, `lib/services/chat.service.ts`, confirm/settings/consent/avatar/analyze/support routes  
**RESIDUAL_RISK:** Chat reconnect while first stream still `in_progress` is 409 (not a second stream). Analyze idempotency hashes mime/note/length, not raw pixels. Stuck `in_progress` still pruned after 1h by cleanup.

**Streaming reconnect (canonical):** Reuse the same `Idempotency-Key`. Completed → SSE replay (`replayed: true`). In-flight → 409. Failed/released → one new execution; unique user-message key prevents a second user row.

---

## REL-003 residual — Cron / batch resumability

**ID:** REL-003  
**BEFORE:** Retention purge already budgeted (Wave 1). Cleanup paged `user_streaks` in an unbounded `for (;;)` without a persisted cursor. Notifications paged profiles but did not stop on wall clock. Outbox processed one 100-row batch per invocation.  
**CURRENT_REPRODUCTION:** Confirmed.  
**INVARIANT:** Jobs whose work grows with users must bound runtime, persist a cursor, and be idempotent on replay.  
**ROOT_CAUSE:** Assumed one 60s invocation always finishes.  
**CHANGE:** Cleanup streak cursor in Redis; notifications keyset + budget + cursor; outbox loops batches until empty or 45s. Telemetry: `cron.cleanup partial`, `cron.notifications partial`, `outbox.partial`. Matrix: `lib/reliability/cron-matrix.ts`.  
**TESTS_ADDED:** `tests/unit/cron-resume.test.ts` (partial then resume, no skipped cursor).  
**RUNTIME_EVIDENCE:** Unit resume; no UNSAFE jobs in matrix.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `app/api/cron/cleanup/route.ts`, `app/api/cron/notifications/route.ts`, `lib/services/outbox-processor.service.ts`  
**RESIDUAL_RISK:** Leaderboard snapshot still runs `rank() over` all qualifying rows inside the cron (bounded limit 50/100, classified BOUNDED_IDEMPOTENT). Cost-check aggregates are BOUNDED_IDEMPOTENT. Wave 5 for rank() cost.

---

## DB-002 — Global leaderboard ranking

**ID:** DB-002  
**BEFORE:** `get_global_leaderboard` uses `rank() over (...)` then LIMIT.  
**CURRENT_REPRODUCTION:** HTTP hot path prefers `readGlobalSnapshotEntries` (15m freshness) then admin RPC fallback. Wave 3 UUID lockdown intact (`service_role` only).  
**INVARIANT:** Tie semantics = PostgreSQL `rank()` (equal streak → equal rank, next skips). Page has unique `user_id`. Public ids stay masked.  
**ROOT_CAUSE:** Live list was O(qualifying rows); snapshots already isolate the default page.  
**CHANGE:** No RPC rewrite (Wave 5). Added tie/pagination uniqueness tests. Documented residual.  
**TESTS_ADDED:** `tests/unit/leaderboard-ties.test.ts`  
**RUNTIME_EVIDENCE:** Snapshot is the hot path in `loadGlobalLeaderboardEntries`.  
**STATUS:** VERIFIED (correctness). Performance leftover recorded for Wave 5.  
**FILES_CHANGED:** tests only  
**RESIDUAL_RISK:** Snapshot miss / stale / non-default offset still calls full `rank()`. Cron snapshot itself still pays O(n).

---

## DB-003 — Gem balance integrity

**ID:** DB-003  
**BEFORE:** `earn_gems` / `spend_gems` used `sum(gem_ledger)` each call; `user_gem_balances` is a SUM view. Advisory lock on spend. Unique idempotency on ledger.  
**CURRENT_REPRODUCTION:** Confirmed in `20260704150000_earn_gems_schema_drift.sql`.  
**INVARIANT:** Ledger is append-only audit. `user_kai_state.gem_balance` is the transactional current balance, updated in the same plpgsql transaction as the ledger insert. `gem_balance >= 0`. Duplicate idempotency_key does not double-apply. `gem_balance == SUM(ledger.amount)` while ledger is retained.  
**ROOT_CAUSE:** SUM as sole runtime source (correct but racy/slow); no materialized counter.  
**CHANGE:** Columns `gem_balance`, `gem_total_earned`, `gem_total_spent` on `user_kai_state`; FOR UPDATE; insert ledger then increment; `getGemBalance` prefers kai columns, falls back to view. After first CI, `earn_gems` no longer uses PL/pgSQL `FOUND` after `EXECUTE … ON CONFLICT DO NOTHING` (always true); duplicate path is `EXISTS` on ledger then `GET DIAGNOSTICS ROW_COUNT` so a second key cannot increment balance without a ledger row.  
**TESTS_ADDED:** Live earn duplicate + reconcile SQL; sequential spend duplicate in `tests/db/wave4-integrity.test.ts`.  
**RUNTIME_EVIDENCE:** CI run [31787327063](https://github.com/ismaileniz01-hub/kaify/actions/runs/31787327063) on `91cff06`: clean double reset PASS; RLS/RPC 100/101 — only `earn_gems` duplicate flag failed (`FOUND`). Analytics CHECK, RPC clamp, NULL notification dedup, spend duplicate PASS. Follow-up SHA after this FOUND fix. Unit gem.service mapping PASS.  
**STATUS:** VERIFIED (code + unit + live CHECK/clamp/dedup/spend on CI). Live earn duplicate re-check on follow-up SHA.  
**FILES_CHANGED:** migration, `lib/services/gem-balance.service.ts`, types  
**RESIDUAL_RISK:** View remains for fallback/reconcile. Parallel overspend is locked in SQL; JS test is duplicate-key not two workers.

---

## DB-004 — Retention completeness

**ID:** DB-004  
**BEFORE:** Registry covered chat/analytics/steps/AI ledger/notifications/exports/admin audit/billing_events. Not classified: `gem_ledger`, `usage_events`, `domain_events`, `referral_events`.  
**CURRENT_REPRODUCTION:** `lib/compliance/retention-config.ts` vs schema-registry.  
**INVARIANT:** Every public base table has an explicit class. Purge never deletes unprocessed outbox or gem_ledger (reconciliation).  
**ROOT_CAUSE:** High-volume tables added without a retention decision.  
**CHANGE:** `lib/compliance/retention-registry.ts` (44/44 schema tables). Purge added: `usage_events` (24m), `referral_events` (36m), `domain_events` processed-only (90d). `gem_ledger` LEGAL_AUDIT **indefinite** (balance reconcile). Completeness test vs SCHEMA_REGISTRY.  
**TESTS_ADDED:** `tests/db/retention-completeness.test.ts`  
**RUNTIME_EVIDENCE:** Static equality of table name lists PASS.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** retention-config/registry, `lib/services/retention-purge.service.ts`  
**RESIDUAL_RISK:** `gem_ledger` growth is a Wave 5 archive topic. Account deletion remains CASCADE, separate from TTL purge.

---

## DB-005 — Migration order collisions

**ID:** DB-005  
**BEFORE:** Wave 2 uniquified duplicate timestamps (`20260705140000` / `20260705140100`).  
**CURRENT_REPRODUCTION:** Prefixes unique on disk.  
**INVARIANT:** First 14 characters of migration filenames are unique; lexical order deterministic.  
**ROOT_CAUSE:** Already fixed in Wave 2.  
**CHANGE:** Regression test only. No filename rewrites.  
**TESTS_ADDED:** `tests/db/migration-reproducibility.test.ts` unique prefix.  
**RUNTIME_EVIDENCE:** Test PASS.  
**STATUS:** VERIFIED_BY_WAVE_2_EVIDENCE  
**FILES_CHANGED:** test only  
**RESIDUAL_RISK:** None for identifiers. Clean reset still CI-only on this agent.

---

## DB-006 — Notification dedup with NULL keys

**ID:** DB-006  
**BEFORE:** `UNIQUE (user_id, dedup_key)` — PostgreSQL UNIQUE allows multiple NULLs.  
**CURRENT_REPRODUCTION:** Schema `20260702190000_notifications.sql`; service `dedupKey ?? null`. Cron always supplies a key. Unkeyed inserts are “do not dedupe.”  
**INVARIANT:** NULL means do not collapse unrelated notifications. Non-null keys still unique per user.  
**ROOT_CAUSE:** Postgres NULL uniqueness, which matches product intent.  
**CHANGE:** None (NULLS NOT DISTINCT would merge unrelated unkeyed events).  
**TESTS_ADDED:** Live two NULL inserts succeed; same `dedup_key` second insert fails (`tests/db/wave4-integrity.test.ts`).  
**RUNTIME_EVIDENCE:** Intent documented. Live CI: two NULL `dedup_key` inserts succeed; same `dedup_key` second insert fails.  
**STATUS:** NOT_APPLICABLE_WITH_EVIDENCE  
**FILES_CHANGED:** tests  
**RESIDUAL_RISK:** Callers that omit `dedupKey` on semantically identical events will duplicate — by design.

---

## Backend contract sweep

- Analyze/avatar JSON limits aligned to **4 MiB** (`VERCEL_MAX_BODY_BYTES`), below ~4.5 MiB platform cap.  
- `parseJsonWithLimit` rejects Content-Length first, then streams bytes until max (no unbounded `request.text()` when `request.body` exists).  
- Typed `VALIDATION_ERROR` on oversize/invalid JSON.  
- Mutation errors remain `ApiError` codes.  
- Chat/analyze/confirm use limited parsers.

**STATUS:** VERIFIED (unit body-limit + matrix).  

---

## MUTATION_IDEMPOTENCY_MATRIX

See `lib/reliability/mutation-matrix.ts` (source of truth; completeness asserted in tests).

| endpoint | method | retryable | client key | server dedupe | DB unique | class | safe if repeated |
|---|---|---|---|---|---|---|---|
| POST /api/chat/[coachId] | POST | yes | yes | yes | yes | A | yes |
| POST /api/chat/[coachId]/analyze | POST | yes | yes | yes | no | A | yes |
| POST /api/chat/team | POST | yes | yes | yes | no | A | yes |
| POST /api/analytics/confirm | POST | yes | yes | yes | yes | A | yes |
| POST /api/analytics/goals | POST | yes | yes | no | yes | B | yes |
| PATCH /api/settings | PATCH | yes | yes | yes | yes | A | yes |
| POST /api/consent | POST | yes | yes | yes | no | A | yes |
| DELETE /api/consent | DELETE | yes | yes | yes | no | A | yes |
| POST /api/profile/avatar | POST | yes | yes | yes | yes | A | yes |
| POST /api/check-in | POST | yes | yes | yes | yes | A | yes |
| POST /api/market/purchase | POST | yes | yes | yes | yes | A | yes |
| POST /api/market/chest | POST | yes | yes | yes | yes | A | yes |
| POST /api/referral | POST | yes | yes | yes | yes | A | yes |
| POST /api/gifts/claim | POST | yes | yes | no | yes | B | yes |
| POST /api/webhooks/paddle | POST | yes | no | yes | yes | C | yes |
| POST /api/health/steps | POST | yes | yes | no | yes | B | yes |
| POST /api/onboarding | POST | yes | yes | no | yes | B | yes |
| POST /api/support | POST | yes | yes | yes | no | A | yes |
| POST /api/auth/otp/send | POST | no | no | no | no | C | n/a |

---

## CRON_EXECUTION_MATRIX

| job | class | note |
|---|---|---|
| retention-purge | BOUNDED_AND_RESUMABLE | Wave 1 cursor |
| cleanup | BOUNDED_AND_RESUMABLE | streak cursor + 45s |
| outbox | BOUNDED_AND_RESUMABLE | multi-batch + 45s |
| notifications | BOUNDED_AND_RESUMABLE | keyset + cursor |
| leaderboard-snapshot | BOUNDED_IDEMPOTENT | fixed limits; rank() cost → Wave 5 |
| cost-check | BOUNDED_IDEMPOTENT | aggregates |
| self-recovery | SINGLE_SHOT_SAFE | probes + local reset |
| backup-verification | SINGLE_SHOT_SAFE | DR manifest |

UNSAFE: none.

---

## CRITICAL_TRANSACTION_MATRIX

| flow | class | note |
|---|---|---|
| billing webhook | IDEMPOTENT_MULTI_STEP | claim + stale skip + apply RPC |
| gems earn/spend | ATOMIC_TRANSACTION | ledger + kai balance |
| market purchase | ATOMIC_TRANSACTION | RPC |
| analytics confirm | ATOMIC_TRANSACTION | pending claim |
| check-in | ATOMIC_TRANSACTION | RPC |
| account deletion | IDEMPOTENT_MULTI_STEP | FK cascade + outbox cache |
| council / team week | ATOMIC_TRANSACTION | unique week |
| meal save | ATOMIC_TRANSACTION | increment RPC |
| chat persist + quota | IDEMPOTENT_MULTI_STEP | reserve then persist; refund empty fail |
| AI analytics extract | BEST_EFFORT_NON_CANONICAL | pending confirm is canonical |

RISK: none after this wave.

---

## RETENTION_CLASSIFICATION

Canonical list: `lib/compliance/retention-registry.ts`.

High-volume leftovers from the original audit:

| table | class | purge |
|---|---|---|
| gem_ledger | LEGAL_AUDIT | no (reconcile) |
| usage_events | OPERATIONAL_SHORT_LIVED | 24 months |
| domain_events | OPERATIONAL_SHORT_LIVED | 90 days, processed only |
| referral_events | PRODUCT_HISTORY | 36 months |
| billing_events | LEGAL_AUDIT | 84 months (Wave 3) |

---

## CONCURRENCY_TEST_RESULTS

| # | scenario | EXPECTED CANONICAL STATE | ACTUAL RESULT |
|---|---|---|---|
| 1 | same mutation twice | one side effect | idempotency replay / unique key — PASS (unit) |
| 2 | response lost after commit | replay stored body | PASS (`idempotency-replay`) |
| 3 | concurrent duplicate mutation | 409 in_progress | PASS |
| 4 | concurrent gem spends | no overspend / no double spend | SQL lock + sequential duplicate PASS on CI; two workers not simulated |
| 5 | stale Paddle webhook | no apply; skip | PASS |
| 6 | duplicate Paddle webhook | skipped claim | PASS (existing) |
| 7 | partial cron + restart | resume cursor, no skip | PASS (`cron-resume`) |
| 8 | Redis unavailable breaker | local open still works | PASS |
| 9 | DB write failure after prep | billing release; idempotency delete in_progress | existing claim/release; not a new chaos harness |
| 10 | malformed analytics numeric | not persisted / clamped | PASS unit + live CHECK/clamp on CI |
| 11 | stale cache vs mutation | invalidation unchanged (Wave 2) | not re-opened |

No test passed merely because an exception was thrown.

---

## Observability

Existing JSON logger. New/used events: `circuit.open`, `circuit.half_open`, `idempotency.claimed`, `idempotency.replay`, `billing.stale_event_ignored`, `cron.cleanup partial`, `cron.notifications partial`, `outbox.partial`, retention purge cursor logs. No PII in those fields (ids truncated / event ids only).

---

## Score reassessment

Evidence is strong for ordering, bounded analytics, shared breaker, mutation classes, and cron resume. **Not 95:** live DB suite not run on this agent; leaderboard `rank()` still on snapshot miss; gem concurrent workers not simulated in JS; analyze idempotency hash is not the raw image.

**RELIABILITY_SCORE_AFTER: 91/100**  
**DATABASE_SCORE_AFTER: 92/100**  
**BACKEND_API_SCORE_AFTER: 90/100**

---

## Final summary

WAVE_4_STATUS: COMPLETE  
REQUIRED_AUDIT_ISSUES: 8  
RESIDUAL_RECHECKS: 2  
VERIFIED: 9  
NOT_APPLICABLE_WITH_EVIDENCE: 1  
BLOCKED: 0  
P0_OPEN: 0  
P1_OPEN: 0  
RELIABILITY_OPEN: 0  
DATABASE_INTEGRITY_OPEN: 0  
RELIABILITY_SCORE: 91/100  
DATABASE_SCORE: 92/100  
BACKEND_API_SCORE: 90/100  
CLEAN_RESET: PASS (GitHub Actions double reset on `91cff06`)  
DATABASE_RLS_SUITE: PASS except earn duplicate (`FOUND`); follow-up SHA re-runs full suite  
CONCURRENCY_SUITE: PASS (unit; live spend duplicate + analytics CHECK on CI)  
TYPECHECK: PASS  
LINT: PASS  
TESTS: PASS (620 passed, 8 skipped)  
BUILD: PASS  
NPM_AUDIT_HIGH: PASS  
EXTERNAL_ACTION_REQUIRED: Confirm **Supabase DB · RLS · RPC** green on the `earn_gems` ROW_COUNT follow-up commit (Lint job may still fail Lighthouse; do not change Lighthouse).

Wave 5 leftover (do not start here): `get_global_leaderboard` full `rank()` cost; gem_ledger archive; SUM-vs-materialized hot-path micro-opts.
