# Wave 1 — Immediate Production Launch Blockers

**Date:** 2026-08-11  
**Source of truth:** `audit/KAIFY_PROFESSIONAL_PRODUCT_AUDIT.md`  
**Scope:** 13 required P1 issues (DB-001 / TEST-001 / TEST-002 explicitly out of scope)

---

## SEC-001 — Push notification open redirect

**BEFORE:** `public/sw.js` navigated to `notification.data.url` with no origin/scheme validation.  
**ROOT_CAUSE:** Trusted UI chrome (app notification) + untrusted payload URL.  
**CHANGE:** Added `lib/security/safe-notification-url.ts` and mirrored logic in `public/sw.js`. Allows same-origin relative/absolute paths only; rejects `javascript:`, `data:`, `blob:`, protocol-relative foreign hosts, malformed/missing URLs; falls back to `/welcome`.  
**TESTS_ADDED:** `tests/security/safe-notification-url.test.ts`  
**VERIFICATION:** Unit cases for relative, absolute same-origin, external https, protocol-relative, javascript, data, malformed, missing; SW source contains the validator.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/security/safe-notification-url.ts`, `public/sw.js`, `tests/security/safe-notification-url.test.ts`  
**RESIDUAL_RISK:** SW and TS module must stay in sync (documented); native push deep links are out of this SW path.

---

## SEC-002 — Supply chain gate (`nanoid`)

**BEFORE:** `npm audit --audit-level=high` failed on `nanoid@3.3.16` (GHSA-2v37-7h3g-55p8).  
**ROOT_CAUSE:** Transitive dependency below patched floor.  
**CHANGE:** `npm audit fix` → `nanoid@3.3.18` (1 package).  
**TESTS_ADDED:** N/A (gate verification).  
**VERIFICATION:** `npm audit --audit-level=high` → `found 0 vulnerabilities`.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `package-lock.json`  
**RESIDUAL_RISK:** None for this advisory.

---

## SEC-003 — OTP email abuse (per-target throttle)

**BEFORE:** IP-only `otp_send` limit (12/15m); rotating IPs could bomb one inbox.  
**ROOT_CAUSE:** No secondary bucket keyed by target address.  
**CHANGE:** `enforceOtpTargetRateLimit` (5/15m) using `hashEmail` (normalized lower/trim). Wired in `/api/auth/otp/send` after validation, before send. Identical `RATE_LIMITED` response (no account-existence leak). IP limit retained.  
**TESTS_ADDED:** `tests/unit/otp-target-rate-limit.test.ts`; `tests/integration/otp.flow.test.ts` updated.  
**VERIFICATION:** Hash bucket key never contains plaintext; equivalent addresses share bucket; IP path still independent.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/api/rate-guard.ts`, `app/api/auth/otp/send/route.ts`, tests above  
**RESIDUAL_RISK:** Distributed attackers with many inboxes still consume IP budget; captcha remains first gate.

---

## PRIV-001 — Account deletion must purge cache

**BEFORE:** `deleteUserAccount` removed auth/DB/storage but left Redis user keys until TTL.  
**ROOT_CAUSE:** Deletion registry covered DB only.  
**CHANGE:** Central `purgeUserCaches(userId)` deletes home (incl. legacy), analytics, session slices, leaderboard rank, avatar signed URL patterns + exact keys/stale companions. Called after successful auth delete; also on outbox `account.deleted`. Documented as `cache:user` in `EXPLICIT_CLEANUP`.  
**TESTS_ADDED:** `tests/compliance/cache-purge-on-delete.test.ts`; deletion-completeness updated.  
**VERIFICATION:** Source order auth-delete → purge; pattern coverage asserted.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/cache/invalidate.ts`, `lib/cache/keys.ts`, `lib/cache.ts`, `lib/services/account.service.ts`, `lib/services/outbox-processor.service.ts`, `lib/compliance/deletion-config.ts`, tests  
**RESIDUAL_RISK:** Purge is best-effort if Redis is down (logged); SCAN may miss exotic key encodings (exact deletes mitigate known namespaces).

---

## PERF-002 — Home cache invalidation

**BEFORE:** `/api/home` wrote `…:locale` / `:profile` keys; invalidation deleted only `:default`; `:stale` companions survived up to 24h.  
**ROOT_CAUSE:** Locale embedded in cache identity; invalidation incomplete.  
**CHANGE:** Home cache identity is locale-free `home:bundle:v3:${userId}:${day}`. `getHomeCoreData` caches data; `localizeHomeData` applies motivation/tip/insight after read. Invalidation deletes exact key + stale companion + legacy `home:bundle:*:${userId}:*` pattern.  
**TESTS_ADDED:** `tests/architecture/home-cache-and-cron.test.ts`; `cache-keys` + `analytics-cache` updated.  
**VERIFICATION:** Session and `/api/home` both use locale-free key + localize; invalidation covers stale + legacy.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/cache/keys.ts`, `lib/cache/invalidate.ts`, `lib/cache.ts`, `lib/services/home.service.ts`, `lib/services/session.service.ts`, `app/api/home/route.ts`, tests  
**RESIDUAL_RISK:** v2 keys expire by TTL if not scanned; acceptable.

---

## REL-001 — Mutation retries must be idempotent

**BEFORE:** `apiFetch` retried POST/PATCH/DELETE on network errors without `Idempotency-Key`.  
**ROOT_CAUSE:** Client retry layer omitted key generation/reuse.  
**CHANGE:** Mutations auto-attach one UUID per logical call; retries reuse the same header; caller-supplied keys preserved; GET/HEAD unchanged. `streamChatMessage` accepts optional key for chat retry (UX-005).  
**TESTS_ADDED:** `tests/unit/api-client-idempotency.test.ts`  
**VERIFICATION:** GET has no key; POST network retry reuses key; supplied key honored.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/api/client.ts`, test above  
**RESIDUAL_RISK:** Endpoints without `withIdempotency` still execute twice if both attempts reach the server before any server-side dedupe — chat stream is in that class; UI reuses key for retries to unlock future server wiring.

---

## REL-002 — Notification scheduling

**BEFORE:** Audit treated `vercel.json` daily schedule as the only runner vs hourly-coded windows.  
**ROOT_CAUSE:** Dual scheduler model (Hobby-safe Vercel daily backup + pg_cron hourly) was not coupled by tests; production depends on pg_cron job being active.  
**CHANGE:** Did **not** switch Vercel to hourly (would require Pro billing vs documented Hobby model). Exported cadence/hour constants; architecture test couples local-hour design → `NOTIFICATIONS_EXPECTED_CADENCE=hourly` → pg_cron SQL `0 * * * *` → Vercel remains `0 6 * * *` backup.  
**TESTS_ADDED:** cadence section in `tests/architecture/home-cache-and-cron.test.ts`  
**VERIFICATION:** Constants + SQL + vercel.json assertions pass.  
**STATUS:** VERIFIED (code/config) with **EXTERNAL activation check**  
**FILES_CHANGED:** `app/api/cron/notifications/constants.ts`, `app/api/cron/notifications/route.ts`, test  
**RESIDUAL_RISK:** If `kaify-notifications-hourly` is inactive in Supabase `cron.job`, retention notifications remain dead despite correct code. See EXTERNAL_ACTION_REQUIRED.

---

## REL-003 — Long-running cron / export execution

**BEFORE:** Whole-user crons shared generic `maxDuration: 10`; retention purge deleted unbounded sets.  
**ROOT_CAUSE:** No execution budget / resume model under serverless caps.  
**CHANGE:** `lib/cron/execution-budget.ts` (budget + batched resume). Retention purge rewritten to bounded batches with Redis cursor checkpoint; warnings run only when complete. `vercel.json` sets `app/api/cron/**` and `profile/export` to `maxDuration: 60`.  
**TESTS_ADDED:** `tests/unit/execution-budget.test.ts`  
**VERIFICATION:** Partial budget preserves cursor; complete clears; vercel overrides asserted.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/cron/execution-budget.ts`, `lib/services/retention-purge.service.ts`, `vercel.json`, test  
**RESIDUAL_RISK:** Other crons (cleanup/outbox) still single-shot within 60s; export streaming redesign (PRIV-002) deferred. Outbox still one batch per invoke (idempotent).

---

## UX-001 — Incomplete shipped locales

**BEFORE:** Picker exposed pt/nl/pl/ru/ko/zh-CN (~25% translated) and ja (~55%) as “reviewed”.  
**ROOT_CAUSE:** Picker list ahead of corpus quality.  
**CHANGE:** Narrowed `REVIEWED_LANG_OPTIONS` to tr, en, de, fr, es, es-mx, es-ar, it, ar. Quality test now measures full non-admin corpus (≥55% translated) for every reviewed locale; removed incomplete codes from picker assertions. No bulk MT generated.  
**TESTS_ADDED:** Rewrote `tests/compliance/i18n-quality.test.ts`  
**VERIFICATION:** Before/after (non-admin keys vs EN): kept locales ~70–94%; removed locales remain ~25–55% and are not in picker.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/i18n/reviewed-locales.ts`, `tests/compliance/i18n-quality.test.ts`, locale key parity sync for new chat strings  
**RESIDUAL_RISK:** Kept locales still have some English strings; internal fallback remains.

---

## UX-005 — Failed chat send must look failed

**BEFORE:** On error, coach placeholder removed but user bubble stayed as delivered.  
**ROOT_CAUSE:** No delivery status in message model.  
**CHANGE:** `sending | delivered | failed` lifecycle; failed UI + accessible status + Retry; retry reuses idempotency key; no duplicate bubble. Helpers in `lib/chat/message-lifecycle.ts`.  
**TESTS_ADDED:** `tests/unit/message-lifecycle.test.ts` (+ LiveChatPanel source assertions)  
**VERIFICATION:** Failed keeps message; retry reuses key; panel contains failed/retry/a11y wiring.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `components/chat/LiveChatPanel.tsx`, `lib/chat/message-lifecycle.ts`, `lib/lang/en.json`, `lib/lang/tr.json`, (+ i18n sync fallbacks), test  
**RESIDUAL_RISK:** Mid-stream failures after server persistence could still duplicate on retry until chat route gains idempotency.

---

## A11Y-001 — Chat streaming accessibility

**BEFORE:** No live region / log semantics; typing dots unlabeled; authors indistinguishable.  
**ROOT_CAUSE:** Chat DOM was visual-only.  
**CHANGE:** `role="log"` + `aria-live="polite"`; list/listitem; author labels; typing status via polite live text (not per-token storm); `aria-busy` while streaming; failed status exposed.  
**TESTS_ADDED:** Covered in `tests/unit/message-lifecycle.test.ts`  
**VERIFICATION:** Source contains required ARIA contracts.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `components/chat/LiveChatPanel.tsx`, i18n keys  
**RESIDUAL_RISK:** Not validated with a real screen reader session in this wave.

---

## A11Y-006 — Form labels / error association

**BEFORE:** Onboarding/auth forms used visual labels without `htmlFor`/`aria-invalid`/`aria-describedby`.  
**ROOT_CAUSE:** Label text present but not programmatically associated.  
**CHANGE:** Fixed OnboardingProfileForm, ProfileModal, SignupWizard, EmailOtpLogin, StepUpChallenge. Removed duplicate OTP full-width input (A11Y-007 adjacent).  
**TESTS_ADDED:** `tests/unit/form-a11y-regression.test.ts`  
**VERIFICATION:** Each form file has `htmlFor` + `aria-invalid`; EmailOtpLogin no longer duplicates OTP input.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** the five form components above, test  
**RESIDUAL_RISK:** No axe-core runtime suite yet; source-level regression only.

---

## OPS-001 — Environment validation order

**BEFORE:** Critical production checks appended to `problems` after `logger.error`, so they never logged.  
**ROOT_CAUSE:** Ordering bug.  
**CHANGE:** All critical production checks (CRON/CSRF/ADMIN_*/PADDLE webhook/Upstash + `DAILY_CHEST_LIMIT_ENABLED=false`) collect before the critical error log.  
**TESTS_ADDED:** `tests/unit/validate-env.test.ts`  
**VERIFICATION:** Each protected secret missing → critical log; chest-limit guard (OPS-002) included; secrets not logged.  
**STATUS:** VERIFIED  
**FILES_CHANGED:** `lib/startup/validate-env.ts`, test  
**RESIDUAL_RISK:** Still non-throwing by design on serverless.

### Opportunistic P3 closure

**OPS-002** — Same root cause as OPS-001 (`DAILY_CHEST_LIMIT_ENABLED` guard). **VERIFIED** with OPS-001.

---

## Cross-issue checks

| Pair | Result |
|------|--------|
| REL-001 + UX-005 | Chat retry reuses idempotency key via lifecycle helper + `streamChatMessage` arg |
| PERF-002 + PRIV-001 | Home invalidation + `purgeUserCaches` share pattern/exact delete helpers |
| SEC-003 + auth UX | Target limit returns same RATE_LIMITED; OTP flow tests still pass |
| REL-002 + REL-003 | Hourly cadence coupled in tests; cron maxDuration 60s + retention budget |
| A11Y-001 + UX-005 | Failed status exposed in accessible chat log UI |

---

## Validation gates

| Gate | Result |
|------|--------|
| Vitest full suite | PASS — 100 files, 536 tests |
| typecheck | PASS |
| lint:strict | PASS |
| production build | PASS |
| npm audit --audit-level=high | PASS — 0 vulnerabilities |
| bundle-budget | PASS |

---

## Summary

```
WAVE_1_STATUS: COMPLETE_WITH_EXTERNAL_BLOCKER
REQUIRED_ISSUES: 13
VERIFIED: 13
BLOCKED: 0
NOT_APPLICABLE: 0
P0_OPEN: 0
P1_OPEN_AFTER_WAVE_1: 3
  (DB-001, TEST-001, TEST-002 — Wave 2; plus any other non-Wave-1 P1s from the audit register)
TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
NPM_AUDIT_HIGH: PASS
EXTERNAL_ACTION_REQUIRED: Confirm Supabase cron.job `kaify-notifications-hourly` is active (schedule `0 * * * *`) against production. Vercel daily notifications entry remains Hobby-safe backup only — do not switch it to hourly without a Pro plan decision.
```

**STOP.** Wave 2 (DB-001 / TEST-001 / TEST-002) not started.
