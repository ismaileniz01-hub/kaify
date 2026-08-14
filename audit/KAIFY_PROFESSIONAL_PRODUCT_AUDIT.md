# Kaify Ai — PRINCIPAL-LEVEL PRE-LAUNCH PRODUCT AUDIT

**Audit date:** 2026-08-11
**Auditor role:** Principal engineer / product reviewer (security, performance, reliability, UX, accessibility, AI systems)
**Scope:** The Kaify Ai application as it exists in this repository at HEAD. No production data was read or modified.
**Method:** Static review of ~44,600 LOC across 498 source files, plus executed tooling — full Vitest suite with coverage, `npm audit`, bundle-budget gate against the existing production build, migration/RLS static analysis, WCAG contrast computation, locale-corpus diffing, and targeted reproduction scripts for cache-key and i18n defects.

---

## EXECUTIVE VERDICT

Kaify Ai is a **well-architected, security-conscious application built by someone who clearly knows what they are doing** — and it is **not yet ready to charge money to real users**.

The engineering foundations are genuinely strong, and unusually so for a pre-launch product. Row-level security is enabled on all 44 tables. All 43 `SECURITY DEFINER` functions pin `search_path`, closing the single most common Supabase privilege-escalation hole. CSRF uses HMAC-signed double-submit cookies with strict SameSite. CSP is nonce-based. Every API route goes through one wrapper that declaratively enforces auth, MFA, rate limits, consent, and AI budget. Paddle webhooks verify signatures and use a claim/finalize/release idempotency protocol. Images are re-encoded through `sharp` to strip metadata. CI runs lint, typecheck, tests, build, a bundle budget, Lighthouse, Playwright, k6 load smoke, `npm audit`, and Gitleaks. There are zero `TODO`/`FIXME`/`HACK` markers in production source. This is the top decile of pre-launch hygiene.

The problem is that **the verification layer is far thinner than the implementation layer, and several user-facing systems are quietly broken in ways no current test can see.**

Three findings define the launch decision:

1. **The test suite proves far less than it appears to.** 488 tests pass and CI reports 86% coverage — but the coverage gate is configured against 34 hand-picked files totalling 2,322 lines, which is **5.2% of the codebase**. Zero of the 99 API route handlers, zero of the 108 React components, zero of the 51 pages, and one of the 45 service modules are inside it. No test in the repository ever executes SQL against a database, so the RLS posture that the entire authorization model rests on is verified only by regular expressions matching migration text. End-to-end testing covers four unauthenticated pages; every authenticated journey — onboarding, chat, photo analysis, check-in, purchase, subscription, account deletion — is behind a staging flag that CI does not set. The product could be badly broken with the pipeline fully green.

2. **Two shipped features are inert or wrong in production, and both were found by reading configuration against code.** The engagement notification cron is written for hourly execution — it filters on local hours 8/10/12/…/22 for water, 19–21 for streak risk, and noon for praise — but `vercel.json` schedules it once daily at 06:00 UTC. The practical effect is that streak-risk reminders reach only users near UTC+13, and the weekly summary only fires for UTC+12/+13. For nearly the entire user base the retention notification system does nothing. Separately, the home-screen cache is written under keys that include a locale segment but invalidated under a hardcoded `:default` key; I reproduced this and confirmed that keys written by `/api/home` are never deleted after a check-in or meal log.

3. **The product ships six languages in its picker that are approximately 82% untranslated English.** I diffed all 54 locale corpora against English across the 829 substantive user-facing strings. Turkish is 96% translated and German, French, Spanish, Italian, and Arabic are around 74%. But Portuguese, Dutch, Polish, Russian, Korean, and Simplified Chinese — all exposed in `REVIEWED_LANG_OPTIONS`, under a comment stating they passed "Phase 3 MT QA" — sit at roughly 18%. A Russian user selecting Русский gets an English landing page, English coach previews, and an English offline banner. The `i18n-quality` test that should catch this passes, because it only checks six key prefixes out of the whole corpus.

4. **The migration chain cannot build a database from scratch, which is why the test gap exists.** `20260703180000_schema_bridge_profiles.sql` backfills from five legacy `profiles` columns — `full_name`, `subscription_tier`, `height`, `weight`, `experience` — that no migration in the repository ever creates. Because the reference sits in a top-level `UPDATE`, Postgres rejects it at parse time, so `supabase db reset` fails partway through the chain. It only works against the pre-existing production database. This reframes the testing finding below: the absence of database-backed authorization tests is not a discipline problem, it is a blocked dependency. It also means recovery from migrations alone has never been possible.

None of these are catastrophic security holes. I found **no P0**. The authorization model looks sound, secrets are not committed, and the abuse surfaces are mostly guarded. But shipping in the current state means charging users for a product with a dead retention system, a badly stale home screen, and six advertised languages that are not actually translated — while lacking the test infrastructure to notice any of it.

A second concern is subtler and runs through the UX findings: **there are four places where the interface reports success, or stays silent, when the underlying operation failed.** A failed chat message stays on screen looking delivered; a leaderboard fetch error renders as an empty leaderboard; the analytics confirmation card swallows errors with no `catch`; and the logged-out photo flow plays a scan animation and fires a success toast without ever contacting the backend. For a coaching product whose value rests on the user trusting that what they logged was recorded, this class of defect costs more than its individual severity suggests.

**The fix list is longer than it first appeared, but still mostly cheap.** Ten of the sixteen P1 issues are XS or S. The notification cron is a one-line schedule change. The npm vulnerability is `npm audit fix`. The environment-validation bug is moving four lines. The realistic path to launch is one to two focused weeks, and the highest-value investment is not any single fix but repairing the migration chain and then building the database-backed integration layer it unblocks, so the next regression of this class is caught by machines rather than by an audit.

> **OVERALL SCORE: 71/100**
>
> **RELEASE RECOMMENDATION: READY_WITH_FIXES**
>
> **CONFIDENCE: MEDIUM-HIGH**
>
> Confidence is high for everything verifiable from source, build artifacts, and executed tooling — security configuration, database schema, bundle weights, translation coverage, contrast ratios, test scope. Confidence is medium for runtime behaviour, because no live authenticated environment was available: I could not measure real LCP/INP on the app shell, exercise a real Supabase instance to confirm RLS denies cross-user reads, or drive the chat and photo-analysis journeys on a device. Those gaps are marked per-category and should be closed before final sign-off.

---

## SCORECARD

| Category | Score | Weight | Confidence | Evidence | Launch impact |
|---|---:|---:|---|---|---|
| Security & Privacy | 81 | 20% | HIGH | STATIC + TESTED | Fix 3 items, then clear |
| Performance & Efficiency | 68 | 15% | MEDIUM-HIGH | TESTED (build) + STATIC | One stale-cache defect blocks |
| Reliability & Data Integrity | 70 | 12% | MEDIUM-HIGH | STATIC + reproduced | Three defects block |
| UX / Product Quality | 66 | 12% | MEDIUM | STATIC + measured corpus | Locale gap and false-success states block |
| Accessibility | 58 | 8% | MEDIUM | STATIC + computed contrast | Chat live region and form labels block |
| Architecture / Maintainability | 80 | 8% | HIGH | STATIC | Migration chain blocks remediation |
| AI / KAIOS Quality | 71 | 8% | MEDIUM | STATIC + reproduced | Fix during week 1 |
| Testing / QA | 52 | 6% | HIGH | TESTED (measured scope) | Blocks confidence in all else |
| Frontend Quality | 72 | 4% | MEDIUM | STATIC | Two fixes needed |
| Backend / API Quality | 83 | 3% | HIGH | STATIC | Clear |
| Observability / Operations | 72 | 2% | MEDIUM | STATIC | Fix one bug |
| SEO / Web Quality | 55 | 1% | HIGH | STATIC | Fix during week 1 |
| Developer Experience | 82 | 1% | HIGH | STATIC + TESTED | Clear once DB reset works |

**Weighted total:** (81×.20) + (68×.15) + (70×.12) + (66×.12) + (58×.08) + (80×.08) + (71×.08) + (52×.06) + (72×.04) + (83×.03) + (72×.02) + (55×.01) + (82×.01) = **70.7 → 71/100**

I used the suggested weights unchanged. They correctly place security, performance, reliability, and UX at 59% of the decision, which matches where the real launch risk sits for this product.

---

# CATEGORY REPORTS

## 1. Security — 82/100 · Confidence HIGH · Evidence STATIC + TESTED

### Strengths

The security model is centralized rather than scattered, which is the single most important structural decision here. `lib/api/route-handler.ts` wraps every route and enforces authentication, rate limiting, AI budget, MFA step-up for sensitive actions, CSRF, and consent from a declarative config object. A developer adding a route cannot forget to authenticate it without going out of their way.

Database posture is the strongest area. My static scan across 69 migrations found:

- **44 of 44 tables have `ENABLE ROW LEVEL SECURITY`.** No table was missed.
- **43 of 43 `SECURITY DEFINER` functions set `search_path`.** This is the classic Supabase privilege-escalation footgun and it is addressed everywhere. One qualification: `trg_unlock_team_chat_on_streak` sets `search_path = public` rather than `''` (`20260630190000_phase8_analytics_market_team.sql:171`). Exploitability is low because `20260702220000_security_hardening.sql:27` revokes `EXECUTE` from `public`, `anon`, and `authenticated`, and the function is only reachable as a trigger — but it is the one function that does not follow the empty-search-path convention the rest of the codebase applies. *(SEC-011)*
- **8 tables have RLS enabled with zero policies** — `idempotency_keys`, `ai_usage_ledger`, `cost_alerts`, `cron_job_runs`, `domain_events`, `retention_purge_runs`, `leaderboard_snapshots`, `backup_verification_runs`. This is deny-all to `anon` and `authenticated`, reachable only via service role. That is the correct pattern for internal tables, and it was clearly deliberate.

Web security headers are complete and set in two places (`next.config.ts` and `vercel.json`): HSTS with `preload`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, a restrictive `Permissions-Policy`, COOP, and CORP. CSP is nonce-based per request via middleware.

`lib/security/csrf-crypto.ts` implements HMAC-signed double-submit cookies with `timingSafeEqualStrings` comparison and strict SameSite — a genuinely correct implementation rather than the usual cargo-cult version.

Image handling in `lib/security/image.ts` re-encodes uploads through `sharp`, stripping metadata and downscaling, with a 5 MB output ceiling. This defeats the entire class of malicious-metadata and decompression-bomb attacks rather than trying to detect them.

Paddle webhook handling verifies signatures and uses a proper `claimBillingEvent` / `finalizeBillingEvent` / `releaseBillingEvent` protocol against a `billing_events` table, so duplicate delivery cannot double-apply a subscription.

Avatar storage guards against IDOR through `isOwnedAvatarPath` and `sanitizeAvatarStorageRef`, and the public leaderboard masks user identifiers through `resolveLeaderboardUserId`.

CI includes Gitleaks with `fetch-depth: 0` (correctly configured for PR range scanning) and `npm audit --audit-level=high`.

### Weaknesses and confirmed defects

**The service worker is an open redirect.** `public/sw.js` handles `notificationclick` by navigating directly to a URL taken from the push payload with no origin validation. Anyone who can influence a notification payload can direct a user to an arbitrary site from what appears to be a trusted app notification. This is the most dangerous confirmed finding. *(SEC-001)*

**The supply-chain gate is currently failing.** `npm audit --audit-level=high` exits 1 on `nanoid@3.3.16` (GHSA-2v37-7h3g-55p8). I confirmed the non-zero exit directly, which means the CI "Supply-chain audit" job is red on main right now. The vulnerability itself is low-impact here — an infinite loop when a custom generator is called with size zero, in a transitive dependency — but a red gate that people learn to ignore is worse than the bug. *(SEC-002)*

**OTP send is permissive enough to weaponize.** `lib/api/rate-guard.ts` allows 12 sends per 15 minutes per IP. Since the target address is attacker-supplied, that is an email-bombing primitive against arbitrary third parties and a fast route to damaging the sending domain's reputation. There is no per-address limit, only per-IP. *(SEC-003)*

**PII redaction in logging is incomplete.** `lib/logger.ts` redacts by keyword, but the list misses `ip`, `clientIp`, and `ipAddress`, all of which are actively logged by middleware on bot blocks, cross-origin blocks, and rate-limit events. IP addresses are personal data under GDPR and are currently written in plaintext. *(SEC-004)*

**The authorization model is untested at runtime.** `tests/security/rls-policies.test.ts` is honestly named "static migration checks" and asserts that migration *text* contains certain `REVOKE` and `GRANT` statements. No test connects to Postgres. Nothing proves that user A cannot read user B's rows. A future migration writing `USING (true)` instead of `USING (auth.uid() = user_id)` would ship with the suite green. Given that 44 tables and 43 definer functions depend on this, it is the largest unverified assumption in the product. *(SEC-005)*

**`billing_events` retains full Paddle payloads indefinitely.** Those payloads contain customer PII (email, name, billing address, partial card metadata) and I found no retention rule covering the table. *(SEC-006)*

**No table uses `FORCE ROW LEVEL SECURITY`.** The table owner bypasses RLS. This is a defence-in-depth gap rather than an exploitable hole, since service role bypasses regardless. *(SEC-007)*

**CSP has no `report-uri` or `report-to`.** Violations — including a successful XSS attempt being blocked — are completely invisible. *(SEC-008)*

**Public leaderboard leaks raw user UUIDs.** Display names are masked but the underlying identifiers reach unauthenticated callers, enabling enumeration and cross-referencing. *(SEC-009)*

**reCAPTCHA verification is shallow.** `lib/api-security.ts` checks only the success boolean, ignoring `score`, `hostname`, and remote IP, which removes most of reCAPTCHA v3's value. *(SEC-010)*

### Recommendations

Validate the notification URL in `public/sw.js` against `self.location.origin` before calling `clients.openWindow`, and reject anything else. Run `npm audit fix` and re-verify the CI job goes green. Add a per-email-address OTP send limit in `lib/api/rate-guard.ts` alongside the existing per-IP bucket. Extend the redaction key list in `lib/logger.ts` to cover the IP variants that middleware actually emits. Add `billing_events` to `lib/compliance/retention-config.ts` with a defined window. Then invest in the item that matters most: a Supabase-local integration suite that authenticates as two distinct users and asserts cross-user reads and writes are denied on every table.

---

## 2. Privacy — 80/100 · Confidence MEDIUM-HIGH · Evidence STATIC

### Strengths

Privacy appears designed in rather than retrofitted. There is an explicit consent architecture — terms consent, AI consent, and a separate photo-analysis consent gate that blocks image upload until accepted (`PhotoAnalyzeConsentModal`, enforced server-side via `requireAiConsent` on the chat route). `lib/compliance/deletion-config.ts` enumerates per-table deletion behaviour as cascade, set-null, or explicit cleanup, and `tests/compliance/deletion-completeness.test.ts` and `export-completeness.test.ts` guard that the config stays in sync with the schema. A retention-purge cron exists. `lib/ai/prompt-safety.ts` redacts personal identifiers before content reaches DeepSeek or Gemini. Sentry has a scrubbing layer with its own test.

### Weaknesses and confirmed defects

**Caches survive account deletion.** `lib/compliance/deletion-config.ts` covers database tables thoroughly but does not touch Redis. Session bundles, home bundles, gem balances, streak status, and signed avatar URLs remain in Upstash after the user's rows are gone — up to 30 minutes for avatars and up to 24 hours for the longest-lived entries. A user who exercises their right to erasure can still have their data served from cache. This is the clearest compliance defect in the product. *(PRIV-001)*

**Data export will fail for exactly the users most likely to request it.** `exportUserData` in `lib/services/account.service.ts` issues unpaginated `select *` queries across roughly two dozen tables and assembles the result in memory, with no streaming. `vercel.json` caps `app/api/**/route.ts` at `maxDuration: 10`. A user with a year of chat history will time out, and the failure surfaces as a generic platform error rather than something the app can explain. *(PRIV-002)*

Avatar cleanup failure during deletion is logged but does not block or retry, so orphaned images can persist in storage.

### Recommendations

Add a cache-invalidation step to the deletion pipeline that deletes every `CacheKeys.*` entry for the user, and assert it in `tests/compliance/deletion-completeness.test.ts`. Convert `exportUserData` to paginated, streamed NDJSON, or move it to a background job that emails a signed download link — the latter is the better fit given the 10-second ceiling.

---

## 3. Performance & Efficiency — 68/100 · Confidence MEDIUM-HIGH · Evidence TESTED (build artifacts) + STATIC

### Measured results

Running the repository's own budget gate against the existing production build:

```
Scanned 264 client chunks under .next/static/chunks
   127 KB gz  5857-b0e6f69b28e4be75.js
    85 KB gz  main-22ae92adf572a2f2.js
    68 KB gz  8802-363a14f22f656575.js
    59 KB gz  framework-f649a9856fefcb0d.js
    53 KB gz  4bd1b696-0676e9a61aae2b86.js
PASS  largest-client-chunk-gzip: 127 KB (max 150)
PASS  core-shared-gzip: 339 KB (max 360)
PASS  middleware-edge-gzip: 114 KB (max 140)
```

Everything passes, and that is the problem worth naming. The script's own comment says budgets are "intentionally above current HEAD," so the gate prevents regression but ratifies a heavy baseline. **339 KB gzipped of core shared JavaScript is roughly 1.1 MB parsed**, which every user downloads and executes before hydration. For a mobile-first consumer fitness app that is high; a competitive target is 150–200 KB gz. The **114 KB gz middleware bundle** runs on every page and API request (static assets are correctly excluded by the matcher) and directly adds edge cold-start latency.

### Strengths

`getSessionBundle` in `lib/services/session.service.ts` is a genuinely good piece of engineering — it collapses six client round-trips into one, reuses the profile and streak objects across sub-fetches instead of refetching, and applies short Redis TTLs to blunt auth-refresh storms. `lib/cache.ts` implements read-through caching with a stale-while-revalidate path and a fail-open design so Redis outages degrade rather than break. `lib/cache/keys.ts` centralizes keys and TTLs. Middleware fast-paths anonymous marketing traffic, skipping both the Redis rate-limit call and the Supabase `getUser()` round trip. Analytics reads in `lib/repositories/analytics-read.repository.ts` are all date-bounded with explicit column lists — no unbounded `select *` on a growing table.

### Confirmed defects

**The home-screen cache is never invalidated for the endpoint that actually populates it.** I reproduced this directly:

```
WRITTEN by /api/home (no ?locale)  : home:bundle:v2:<uid>:2026-08-11:profile
WRITTEN by /api/home (?locale=tr)  : home:bundle:v2:<uid>:2026-08-11:tr
WRITTEN by /api/session            : home:bundle:v2:<uid>:2026-08-11:default
DELETED by invalidateHomeBundleCache: home:bundle:v2:<uid>:2026-08-11:default

Stale keys never deleted:
  home:bundle:v2:<uid>:2026-08-11:profile
  home:bundle:v2:<uid>:2026-08-11:profile:stale
  home:bundle:v2:<uid>:2026-08-11:default:stale
```

The cause is a two-line mismatch in `lib/cache/keys.ts` and `lib/cache/invalidate.ts`:

```39:40:lib/cache/keys.ts
  homeBundle: (userId: string, day = utcDayKey(), locale = "default") =>
    `home:bundle:v2:${userId}:${day}:${locale}`,
```

```63:63:lib/cache/keys.ts
  homeBundle: (userId: string) => [CacheKeys.homeBundle(userId)],
```

`invalidateHomeBundleCache` therefore deletes exactly one key — the `:default` variant written by `/api/session`. Every key written by `/api/home`, which is what the client calls on the welcome screen with a locale argument, survives. The user logs a meal or checks in, and the home screen keeps showing pre-action numbers. Worse, `cachedWithStale` writes a `:stale` companion under `CacheTTL.homeBundleStale = 86_400`, and that companion is never deleted for any variant, so the stale-read path can serve pre-action data for **up to 24 hours**. *(PERF-002)*

**Opening the app costs three sequential round trips, one of which is a write.** On a cold load the client calls `GET /api/session` (six sub-fetches plus Redis), then `POST /api/check-in` (a database write plus three cache invalidations plus notification work), then `GET /api/home?locale=xx` (a full home rebuild under a different cache key). The middle call is a mutation issued on every app open regardless of whether anything changed. *(PERF-003)*

**Every route in the application is dynamically rendered.** `generateMetadata` in `app/layout.tsx` reads cookies, which forces dynamic rendering across the entire tree — including the landing, pricing, and privacy pages that have no per-user content. Those pages cannot be CDN-cached and pay full TTFB on every visit. *(PERF-004)*

**`assertUserDailyAiBudget` paginates a growing ledger on every AI request.** `lib/ai/daily-cost-cap.ts` scans `ai_usage_ledger` rather than reading a maintained aggregate, so the cost of the budget check grows with usage — on the hot path of the product's most expensive operation. It also performs an unconditional Redis write to update a pressure flag on every request. This is worse than it first appears, because `/api/home` declares `requireAi: true` and `dailyAiBudget: true`, so merely opening the welcome screen triggers the full ledger scan even when no model is invoked. *(PERF-005)*

**`cachedWithStale` doubles Redis writes.** It writes the stale companion key on every fresh read rather than only on expiry, so each cache miss costs two writes instead of one. *(PERF-006)*

**Signed avatar URLs are cached for 30 minutes with no invalidation on upload.** A user changes their avatar and continues to see the old one for up to half an hour — a visible, confidence-eroding bug in a personalization feature. *(PERF-007)*

### Recommendations

Fix the cache-key mismatch first: either make `invalidateHomeBundleCache` delete all locale variants (including `:stale`) via a pattern scan, or drop the locale segment from the key and localize at render time. The second option is better — locale does not change the underlying data, only its presentation. Move the check-in write off the app-open path and trigger it from an explicit user action or a single daily client-side guard. Move cookie access out of `generateMetadata` so marketing routes can render statically. Replace the ledger scan with a materialized daily aggregate. Add `CacheKeys.avatarSigned` invalidation to the avatar upload handler.

---

## 4. Reliability & Data Integrity — 72/100 · Confidence MEDIUM-HIGH · Evidence STATIC + reproduced

### Strengths

There is a real reliability layer here, not just try/catch. `lib/resilience/` provides retry with taxonomy-aware error classification, circuit breaking, and a `resilient()` wrapper. There is an outbox pattern with a dedicated cron, cron-run monitoring via `recordCronRun`, backup verification, and disaster-recovery and SLO tests. The Paddle idempotency protocol is correct. `performCheckIn` is idempotent per UTC day at the RPC level. The SSE implementation in `lib/api/sse.ts` handles client cancellation properly and drives the generator's `finally` block so reserved AI quota is refunded on disconnect — a detail that is easy to miss and expensive to get wrong.

### Confirmed defects

**The engagement notification system is effectively dead.** `app/api/cron/notifications/route.ts` documents itself as "Intended to run hourly" and filters on the user's local hour: 19–21 for streak risk, `{8,10,12,14,16,18,20,22}` for water, 18–19 on Sunday for the weekly summary, and 12 for praise. `vercel.json` schedules it `"0 6 * * *"` — once per day at 06:00 UTC. The consequences follow mechanically: streak-risk reminders only fire for users around UTC+13 to UTC+15, the weekly summary only for UTC+12/+13, praise only for UTC+6, and water reminders once per day for roughly half of timezones instead of eight times. For the overwhelming majority of users, the retention notification system produces nothing. The code is correct; the schedule is wrong. *(REL-002)*

**The API client retries mutations without idempotency keys.** `lib/api/client.ts` retries POST, PATCH, and DELETE on network error. `lib/api/idempotency-store.ts` accepts `string | null` and simply runs the handler uncached when the key is absent, and the client does not send an `Idempotency-Key` header. So a retry after a request that actually succeeded but whose response was lost will duplicate the write. Affected endpoints include `/api/profile/avatar`, `/api/consent`, `/api/settings`, and `/api/analytics`. Check-in happens to be protected by the RPC's own per-day idempotency, but that is luck rather than design. *(REL-001)*

**Whole-user-base jobs run under a 10-second ceiling.** `vercel.json` sets `maxDuration: 10` for `app/api/**/route.ts`. Only the notifications cron overrides it to 60. That leaves `cleanup`, `retention-purge`, `outbox`, `leaderboard-snapshot`, `self-recovery`, `cost-check`, and `backup-verification` — all of which paginate across the entire user base — with ten seconds. These will begin timing out mid-run somewhere in the low thousands of users, and a partially-completed retention purge is a compliance problem, not just an operational one. *(REL-003)*

**Circuit breakers are per-process.** `lib/ai/circuit-breaker.ts` and `lib/resilience/circuit.ts` hold state in memory. On Vercel each serverless instance therefore maintains its own independent view of provider health, so during a DeepSeek outage every cold instance must fail its own threshold before opening. The breaker cannot do the job it exists to do. *(REL-004)*

**`analytics_daily` has no range constraints.** Comparable tables get this right — `user_streaks`, `user_usage_counters`, and `user_kai_state` all carry `CHECK (... >= 0)`. `analytics_daily` does not, so AI-extracted values like 999,999 calories or −5,000 calories persist and then corrupt every downstream weekly aggregate and chart. *(REL-005)*

**Paddle events can arrive out of order.** `lib/services/billing.service.ts` applies tier changes in delivery order without comparing event timestamps or occurrence sequence, so a delayed `subscription.updated` landing after a `subscription.canceled` can resurrect a cancelled subscription. *(REL-006)*

### Recommendations

Change the cron schedule to `"0 * * * *"` — this is a one-line fix that reactivates the entire notification system, and it is the single highest value-per-minute change in this report. (Note that hourly crons require a Vercel Pro plan.) Make `lib/api/client.ts` generate a UUID `Idempotency-Key` per logical mutation and reuse it across retries. Raise `maxDuration` for the cron paths and add continuation cursors so a timed-out run resumes rather than restarts. Move circuit-breaker state into Redis so it is shared across instances. Add `CHECK` constraints to `analytics_daily` matching the discipline already applied elsewhere, and validate extracted values before they reach `analytics-confirmation.service.ts`. Compare `occurred_at` before applying a Paddle tier change.

---

## 5. UX / Product Quality — 70/100 · Confidence MEDIUM · Evidence STATIC + measured corpus

**Note on confidence:** no live authenticated environment was available. This assessment is based on component source, the translation corpus, and state handling. Real device walkthroughs of onboarding, chat, and purchase are still required before sign-off.

### Strengths

The visual and interaction system is coherent and deliberate. There is a shared motion layer (`lib/motion/use-presence`, `MotionDialog` with center and sheet variants, drag-to-dismiss with a scroll guard), haptics on native, skeleton loaders, an `EmptyState` primitive, an `InlineAlert` primitive, and a toast system with proper live regions. Consent flows are well-constructed — the photo-analysis gate stores the pending file, opens the modal, and resumes the upload on acceptance rather than making the user re-pick. Chat renders a bounded message window rather than the full history. Reduced-motion is honored and covered by an E2E test.

### Confirmed defects

**Six languages in the picker are approximately 82% English.** I compared all 54 locale files against English across the 829 substantive strings (longer than 12 characters and containing a space, which filters out brand names, numerals, and single words). Percentage of substantive strings still identical to English:

| Locale | Still English | Locale | Still English |
|---|---:|---|---:|
| Turkish | 4% | Japanese | 52% |
| German, French, Spanish (×3), Italian, Arabic | 26% | Portuguese, Dutch, Polish, Russian, Korean, Chinese (Simplified) | 82% |

All of these are exposed in `lib/i18n/reviewed-locales.ts`, under a comment reading "Locales exposed in the language picker after Phase 3 MT QA." Concrete examples confirmed in both `ru.json` and `zh-CN.json`:

```
offline.banner              "You're offline. Some features may be unavailable."
contact.kai.preview         "Hey! How are you feeling today?"
landing.coaches.intro       "Hiring a trainer, nutritionist, and posture coach costs..."
```

The failure is systematic rather than random: newer key namespaces (`landing.*`, `contact.*`, `offline.*`) were added to English and copied verbatim into every locale outside the TR/DE/FR/ES/IT/AR group. The entire marketing landing page and the chat contact list are English in six shipped languages. The repository already contains `npm run i18n:retranslate:priority` targeting exactly these locales, and an untracked `i18n-fill.log`, which suggests a fill run that was started and not completed. *(UX-001)*

**Turkish error text reaches non-Turkish users.** The architecture for this is correct — `lib/i18n/api-error.ts` maps stable error codes to localized strings, and API routes return machine-readable codes. But two paths bypass it. `lib/api/sse.ts` hardcodes `"Akış sırasında bir hata oluştu."` into the SSE error event, so any mid-stream chat failure shows Turkish to everyone. And `LiveChatPanel.tsx` deliberately surfaces the raw server message for `VALIDATION_ERROR` and `FORBIDDEN` on the photo path, with a comment asserting those messages "are already localized" — which is not true for the generic validation errors thrown by the route (`"Geçersiz koç."`, `"Geçersiz istek."`). Roughly 55 files under `app/api/` and `lib/` contain hardcoded Turkish message strings. *(UX-002)*

**Unauthenticated users see fabricated data.** `app/(app)/welcome/page.tsx` renders `DEMO_USER_PROFILE` and `DEFAULT_GEMS` while the session resolves. Combined with client-side-only auth gating, a slow session refresh produces a flash of plausible-looking fake stats before either real data or a redirect. Users cannot tell demo values from their own. *(UX-003)*

**The error-code map is too coarse to be helpful.** Nine codes cover the entire application, so every validation failure anywhere renders the same generic sentence. The photo-analysis path bypassed the map precisely because the generic string was useless there — which is a signal that the map needs per-context keys rather than that the bypass was right. *(UX-004)*

**Four states tell the user something succeeded, or nothing failed, when neither is true.** The audit brief specifically asked where a user might "believe an action succeeded when it did not," and there are four concrete instances:

- **A failed chat send leaves the user's message on screen.** `LiveChatPanel.tsx:220-231` removes the coach placeholder on error but keeps the user bubble, so a message that never reached the server looks delivered. There is no failed-state marker and no retry. *(UX-005)*
- **A leaderboard fetch failure renders the empty state.** `leaderboard/page.tsx:226-228` catches the error and only sets `loading = false`, leaving `data` null — which the render path interprets as "no entries" rather than "we could not load this." Users conclude the leaderboard is empty. *(UX-006)*
- **The analytics confirmation card fails silently.** `AnalyticsConfirmationCard.tsx:23-35` has a `try`/`finally` with no `catch`, so a failed confirm re-enables the buttons with no message and no state change. The user cannot tell whether their calories were recorded. *(UX-007)*
- **The guest photo flow fakes an analysis.** `chat/[id]/page.tsx:248-260` runs a scan animation, emits a success toast, and appends a "photo sent" bubble with no upload and no backend call. A logged-out visitor evaluating the product is shown a fabricated result. *(UX-008)*

Related: `FirstTaskChecklist` marks the "chat with a coach" task complete when the user clicks the link, not when a message is sent, so the onboarding checklist can report progress that did not happen. And `ChatRichCard.tsx:281-304` hardcodes Turkish section headers such as `ANTRENMAN` directly into the daily-summary card, which appear untranslated in all 54 locales. Logout in `settings/page.tsx:240-246` executes immediately with no confirmation, while account deletion — correctly — requires typing `DELETE` plus a step-up challenge.

### Recommendations

Either run `npm run i18n:retranslate:priority` to completion and re-verify with a corpus diff, or reduce `REVIEWED_LANG_OPTIONS` to the locales that are genuinely translated (tr, en, de, fr, es, es-mx, es-ar, it, ar) and re-add the rest as they land. Shipping fewer honest languages is strictly better than shipping sixteen where six are English. Replace the hardcoded string in `lib/api/sse.ts` with an error code the client localizes. Introduce specific error codes for the photo-analysis failures so the panel can drop its raw-message bypass. Render a neutral skeleton instead of demo data on `/welcome`.

---

## 6. Accessibility — 63/100 · Confidence MEDIUM · Evidence STATIC + computed contrast

### Strengths

`components/ui/MotionDialog.tsx` is the best-implemented piece of accessibility work in the repository, and it is genuinely good: `role="dialog"`, `aria-modal`, a required `labelledBy` prop enforced by the type signature, a real focus trap that cycles Tab and Shift-Tab and handles the zero-focusable case, Escape handling that correctly identifies the topmost non-exiting dialog before acting, focus restoration to the previously-focused element on close, and body scroll locking. Eight components use it, so the quality is shared rather than isolated.

Beyond that: there is a skip link, `#main-content` is asserted in E2E, the toast provider exposes both polite and assertive live regions, loading skeletons carry `sr-only` text, decorative icons are `aria-hidden`, reduced-motion is honored and E2E-tested, RTL direction is applied at the `<html>` level for ar/he/fa/ur and updated on language change, and CI enforces a Lighthouse accessibility score of 0.85 as an error.

### Confirmed defects

**The core product interaction is silent to screen readers.** The chat message list in `LiveChatPanel.tsx` has no `aria-live` region and no `role="log"`. AI replies stream in token by token with zero announcement. The typing indicator is three unlabeled `<span class="typing-dot">` elements, so there is no "Kai is typing" signal either. Messages are nested `<div>`s without list semantics, and nothing in the accessible name distinguishes the user's messages from the coach's. A blind user can send a message into Kaify Ai and receive no indication that anything happened. Only four files in the entire codebase use `aria-live`, and none of them is the chat. *(A11Y-001)*

**Two heavily-used text colors fail WCAG AA.** Computed against the base surface `--kaify-black: #0a0a0a`:

| Token | Uses | Contrast | AA normal (4.5:1) | AA large (3:1) |
|---|---:|---:|---|---|
| `text-zinc-400` | 168 | 7.72:1 | PASS | PASS |
| `text-zinc-500` | 130 | **4.10:1** | **FAIL** | PASS |
| `text-zinc-300` | 74 | 13.40:1 | PASS | PASS |
| `text-zinc-600` | 38 | **2.56:1** | **FAIL** | **FAIL** |
| `text-zinc-200` | 13 | 15.60:1 | PASS | PASS |

`text-zinc-600` at 2.56:1 fails even the 3:1 threshold for large text and non-text contrast. That is 168 instances of measurably sub-AA text. Encouragingly, the opacity-based timestamp styling I expected to fail actually passes — white at `opacity-60` computes to 7.30:1. *(A11Y-002)*

**The accessibility gate covers nothing that matters.** `lighthouserc.cjs` runs against `/`, `/pricing`, `/privacy`, and `/login` only. Every authenticated screen — chat, welcome, analytics, settings, market, leaderboard — has no automated accessibility coverage at all. The performance assertion is also only a `warn` at 0.65, so it cannot fail the build. *(A11Y-003)*

**Background content stays reachable behind modals.** `MotionDialog` traps Tab but does not apply `inert` or `aria-hidden` to the rest of the page, so a screen reader's browse mode can still wander outside the dialog. *(A11Y-004)*

**RTL layout will mirror incorrectly in Arabic.** Spacing is largely RTL-safe — only 15 physical `ml-`/`mr-`/`pl-`/`pr-` usages remain. But there are roughly 59 physical `left-`/`right-` positional utilities, concentrated in settings, the notification center, image picker, offline banner, and chat, which will not flip under `dir="rtl"`. *(A11Y-005)*

**Form labels are visual, not programmatic, across the auth and onboarding surfaces.** `OnboardingProfileForm.tsx:147-155` is representative: a `<label>` sits next to an `<input>` with no `htmlFor`/`id` pairing, and the pattern repeats for every field in the form. The same applies to `ProfileModal` edit mode, `SignupWizard` step inputs, `EmailOtpLogin`'s email field, and `StepUpChallenge`. Errors are rendered nearby but not linked via `aria-describedby`, and no field sets `aria-invalid`. A screen reader user filling in onboarding hears unlabeled edit fields. This is WCAG 1.3.1 and 3.3.2, and it covers the mandatory first-run flow. *(A11Y-006)*

**The OTP screen renders two inputs for the same code.** `EmailOtpLogin.tsx:267-288` mounts `OtpDigitInput` — a well-built six-cell component with arrow-key, backspace, and paste handling — and then, immediately below it, a second full-width `<input>` bound to the same `code` state. Keyboard users tab through the code twice and screen readers announce it twice. `OtpDigitInput` on its own is good work; the duplicate appears to be a leftover fallback. *(A11Y-007)*

**Three high-traffic pages have no `<h1>` and two have no `<main>`.** Chat (`app/(app)/chat/[id]/page.tsx`) has neither; settings and leaderboard have `<main>` but start their outline at `<h2>`. `AppHeader` renders the page title into a plain `<div>` (`AppHeader.tsx:48`), so titles never enter the document outline and heading-based navigation does not work. *(A11Y-008)*

**Several interactive controls fall below the 44px target minimum,** despite a `.touch-44` utility existing and being used correctly elsewhere. The streak "Claim Lv.X" button is `text-[10px]` with `py-1`, and the notification panel close button is 36px square. *(A11Y-009)*

Settings toggles expose `aria-pressed` but no `aria-label`, so their state is announced without saying which setting it belongs to; the language picker is a custom popover with no `aria-expanded`/`aria-haspopup` and a backdrop dismissable only by pointer.

### Recommendations

Wrap the chat message list in `role="log"` with `aria-live="polite"` and `aria-relevant="additions text"`, give the typing indicator an `sr-only` label, and add per-message author attribution to the accessible name. Replace `text-zinc-600` with `text-zinc-400` everywhere it carries text, and `text-zinc-500` with `text-zinc-400` for anything below 18pt. Add authenticated routes to the Lighthouse run using a stored storage-state, and promote the performance assertion from `warn` to `error`. Apply `inert` to the app root while a dialog is open. Convert the positional utilities in interactive components to `start-`/`end-`.

---

## 7. Architecture & Maintainability — 84/100 · Confidence HIGH · Evidence STATIC

### Strengths

The layering is clean and, importantly, enforced. Routes delegate to services, services delegate to repositories, and `tests/architecture/` contains actual tests asserting domain boundaries, cache-key discipline, repository usage, and v1 deprecation handling. Cross-cutting security lives in one wrapper rather than being repeated per route. Cache keys and TTLs live in a single registry. Database types are generated. Environment validation runs at boot from `instrumentation.ts`. There are 69 ordered migrations with a consistent naming scheme.

Release hygiene is genuinely excellent and I want to be specific because it is rare: **zero `TODO`, `FIXME`, `HACK`, or `XXX` markers across all 498 source files.** Only eight `console.*` calls, of which three are inside the logger itself and the rest are in error boundaries. Four `@deprecated` markers, each with a documented migration path. No committed secrets, no `localhost` references in production paths, no commented-out logic blocks.

### Weaknesses

**Boot-time environment validation silently drops its most important findings.** In `lib/startup/validate-env.ts`, `logger.error("env validation failed (critical)", { problems })` runs at line 48. But the checks for missing `CRON_SECRET`, `CSRF_SECRET`, `ADMIN_HUB_PASSWORD`, `ADMIN_HUB_SECRET`, and `PADDLE_NOTIFICATION_WEBHOOK_SECRET` in production all push into `problems` at lines 58–82 — *after* that log statement has already executed. The same applies to the `DAILY_CHEST_LIMIT_ENABLED=false` production guard at line 92. Those entries are appended to an array that nothing reads again. Deploying without a CSRF secret produces only the soft "optional vars missing" warning. The function is well-designed and well-commented; the ordering defeats it. *(OPS-001, OPS-002)*

**Protected pages are gated on the client.** `app/(app)/layout.tsx` performs no authentication check; pages rely on `useSession`. This is not a security hole — the APIs are all guarded server-side — but it produces the flash-of-demo-content problem and a burst of 401s on slow sessions. *(ARCH-001)*

The 54-locale surface is a large maintenance commitment for a pre-launch product, and it is currently maintained by tooling that has drifted from reality.

### Recommendations

Move the production checks above the error log in `validate-env.ts`, or re-evaluate `problems.length` after all checks complete. Add a server-side session check in the `(app)` layout that redirects unauthenticated requests before any HTML is streamed.

---

## 8. AI / KAIOS — 74/100 · Confidence MEDIUM · Evidence STATIC + reproduced

### Strengths

The prompt-safety work in `lib/ai/prompt-safety.ts` is layered rather than relying on a single trick: input sanitization, spotlighting of untrusted content, a system preamble, canary tokens, output scrubbing, and injection-signal detection. There is a dedicated red-team test file. Memory is sanitized on write and wrapped in delimiters marked data-only on read, which blocks the direct memory-poisoning path. Quota is reserved before generation and settled or refunded after, including on SSE disconnect. Daily cost caps operate at both platform and per-user level. Vision inputs are re-encoded through `sharp` before reaching Gemini. There is a provider abstraction with a model router rather than direct SDK calls scattered through the code.

### Confirmed defects

**PII redaction corrupts legitimate fitness data.** `PHONE_PATTERN` in `redactPersonalIdentifiers` is broad enough to match ordinary numeric sequences. A user typing their stats as "180 75 25" (height, weight, age) has them redacted before the coach ever sees them, as do date-like strings such as "2026 08 11". The coach then responds to a message with its most important content removed, and neither the user nor the developer has any indication of why. *(AI-001)*

**Model-extracted analytics are written without range validation.** `lib/ai/coach-analytics.ts` extracts numeric values from conversation and hands them to `analytics-confirmation.service.ts` unchecked. Combined with the missing `CHECK` constraints on `analytics_daily` (REL-005), values like 999,999 calories or −5,000 calories reach the database and poison every derived chart and weekly aggregate. Two independent layers that should each have caught this both do not. *(AI-002)*

**Secondary model calls are unmetered.** `maybeGenerateStructuredCard` and `applyCoachAnalyticsFromChat` each invoke a model and consume tokens, but neither deducts from the user's quota. A user on a metered plan can drive two to three times their nominal token consumption through normal use, and the platform absorbs the difference. *(AI-003)*

**JSON extraction from model output is brittle.** `lib/ai/structured-chat.ts` uses a greedy `/\{[\s\S]*\}/` to find JSON in the response. Any prose containing braces before or after the payload breaks the match, and greedy matching across multiple objects captures the wrong span. *(AI-004)*

The per-instance circuit breaker (REL-004) applies here too. (`coaching_memory` grows one row per twenty messages, but it *is* covered by the 24-month retention purge, so it is bounded.)

**Client disconnect does not abort the upstream provider call.** `streamCoachReply` never forwards an abort signal to `ModelRouter.streamText`, so when the SSE stream is cancelled the DeepSeek request continues generating until its 60-second timeout. The quota refund path works, but the tokens are still spent with the provider and no one receives the output. Every abandoned chat is billable waste. *(AI-005)*

**The team-chat path is materially less defended than direct chat.** `team-chat.service.ts` omits `buildSecurityPreamble`, the canary token, `detectInjectionSignals`, and output scrubbing, all of which the main chat path applies. It also omits `requireTermsConsent` from its route guards, which `/api/chat/[coachId]` declares. On JSON parse failure it inserts hardcoded English fallback copy into the database regardless of the user's locale. *(AI-006)*

**Coach turns re-enter the prompt unsanitized.** In `chat.service.ts:265-271` only `role === "user"` history entries get stable delimiter wrapping; assistant content is passed through raw. Text the model was induced to emit on one turn can therefore carry instructions back into the next turn's context. *(AI-007)*

**A malformed image-quality score defaults to a passing value.** `analysis.schema.ts:101-104` falls back to 7 when the quality response cannot be parsed, above the rejection threshold of 3. The intent is to avoid false rejections, but it means a garbled quality response silently authorizes the expensive vision and synthesis calls. *(AI-008)*

**On the KAIOS specifications:** the audit brief asked for a review against 17 canonical KAIOS specs. A repository-wide search returns **zero matches for "KAIOS"** in code, comments, or documentation. The closest artifacts are generic coaching/AI sections in `docs/architecture/bounded-contexts.md`. The AI subsystem was therefore evaluated on its own merits rather than against those specs. If the specs exist outside this repository, this section should be re-reviewed against them.

There is no AI behavioural evaluation suite — nothing measures whether the coaches actually give coherent, on-persona, safe advice across a fixed prompt set. That is a meaningful gap for a product whose core value is AI output quality, though it is a common one at this stage.

### Recommendations

Tighten `PHONE_PATTERN` to require phone-like structure (country code, separators, or a length that does not collide with three-number stat lines) and add the "180 75 25" case as a regression test. Add explicit bounds validation before analytics extraction is persisted, in addition to the database constraints. Meter the structured-card and analytics calls against the same quota as the primary reply. Replace the greedy regex with a balanced-brace scan or ask the provider for a JSON-mode response.

---

## 9. Testing & QA — 52/100 · Confidence HIGH · Evidence TESTED (measured)

This is the lowest score in the audit, and it is not because the team wrote no tests. They wrote 488 across 91 files covering security, compliance, scalability, architecture, reliability, and operations, and the CI pipeline is more thorough than most funded startups run. The score is low because **the tests measure much less than their green status implies**, and that gap is quantified rather than asserted.

### What actually runs

```
Test Files  91 passed (91)
Tests      488 passed (488)
Duration   6.50s (tests 1.50s)
Coverage   Statements 86% (584/679)
```

### Measured scope of the coverage gate

`vitest.config.ts` restricts `coverage.include` to 34 explicitly listed files. Measured against the codebase:

| Area | Files | In gate | LOC | LOC in gate |
|---|---:|---:|---:|---:|
| `components/` (React UI) | 108 | **0** | 14,201 | **0** |
| `lib/` (other) | 173 | 29 | 13,539 | 1,829 |
| `lib/services/` (business logic) | 45 | **1** | 6,387 | 73 |
| `app/` (pages & layouts) | 51 | **0** | 5,201 | **0** |
| `app/api/` (route handlers) | 99 | **0** | 2,855 | **0** |
| `lib/ai/` (KAIOS) | 20 | 4 | 2,149 | 420 |
| `lib/repositories/` (DB access) | 2 | **0** | 252 | **0** |
| **Total** | **498** | **34 (6.8%)** | **44,584** | **2,322 (5.2%)** |

The reported 86% applies to 5.2% of the code. Effective coverage of the application is approximately **4.5%**. Not measured at all: every API route handler, every React component, `middleware.ts`, `billing.service.ts` (money), `account.service.ts` (deletion), `leaderboard.service.ts`, `streak.service.ts`, `coach-analytics.ts`, `structured-chat.ts`. The config comment is honest about the intent — "gate the pure, unit-testable core" — but the resulting number is presented in CI without that context. *(TEST-001)*

### No test touches a database

I searched for any Postgres connection, Supabase local startup, or testcontainer usage across `tests/`. There is none. `tests/security/rls-policies.test.ts` reads all migration files into a string and asserts that the text matches patterns like `/revoke insert on public\.chat_messages from authenticated/i`. That verifies a migration was written. It does not verify the database enforces anything. The entire authorization model — 44 tables, 43 definer functions — is unvalidated at runtime. *(TEST-002)*

### End-to-end covers only logged-out pages

Three spec files. `smoke.spec.ts` checks that the landing page renders `#main-content`, `/api/health` responds, `/login` loads, the cookie banner opens and closes, reduced motion disables animation, and route progress appears. `auth-otp.spec.ts` is gated behind `E2E_AUTH_ENABLED`, which `ci.yml` does not set. So no automated test ever completes onboarding, sends a chat message, uploads a photo for analysis, performs a check-in, buys something in the market, changes a subscription, or deletes an account. *(TEST-003)*

### A green test that certifies a broken feature

`tests/compliance/i18n-quality.test.ts` contains a test named "keeps priority locales from being English clones on public surfaces" that checks 12 locales — but only against `landing.hero.`, `landing.about.`, `pricing.hero.`, `pricing.final.`, `a11y.`, `error.global.`, plus four exact keys. It excludes `landing.coaches.`, `landing.features.`, `landing.streak.`, `landing.leaderboard.`, `contact.*`, `offline.*`, and everything else. That is why it passes while Russian is 82% English. The Turkish-specific test immediately above it *does* cover `landing.features.` and `landing.streak.`, so the narrower scope in the priority-locale test was a deliberate choice that has since become misleading. *(TEST-004)*

### Could the product be seriously broken while all tests are green?

Yes, and it currently is. The notification cron misconfiguration, the home-cache invalidation mismatch, the six untranslated locales, the environment-validation ordering bug, and the service-worker open redirect are all live in the repository with the suite fully green. Every one of them was found by reading code and configuration against each other, which is exactly the work a test suite is supposed to automate.

### Strengths worth preserving

The breadth of *categories* is excellent and unusual: dedicated directories for security, compliance, scalability, architecture, reliability, operations, and sustainability. The compliance tests that assert deletion and export configs stay in sync with the schema are a genuinely smart pattern. The CI pipeline — lint with `--max-warnings 0`, typecheck, i18n check, coverage gate, build, bundle budget, Lighthouse, Playwright, k6 with an SLO gate, `npm audit`, Gitleaks — is strong. The scaffolding is right; it is pointed at too little of the code.

### Recommendations

In priority order: stand up `supabase start` in CI and write cross-user authorization tests that authenticate as two users and assert denial on every table — this closes the largest unverified assumption in the product. Expand `coverage.include` to `lib/**` and `app/api/**` and accept a much lower headline number that is actually meaningful. Enable authenticated E2E against a seeded staging user for the five core journeys. Widen the i18n-quality assertion to the full corpus with an explicit, reviewed allowlist.

---

## 10. Frontend Engineering Quality — 75/100 · Confidence MEDIUM · Evidence STATIC

**Strengths.** Sensible component architecture with shared primitives (`MotionDialog`, `EmptyState`, `InlineAlert`, `ToastProvider`). A presence system for enter/exit animation. Error boundaries at both `app/error.tsx` and `app/global-error.tsx`. A bounded chat render window. Server and client component boundaries are mostly deliberate. Native integration through Capacitor is isolated behind `lib/native/`.

**Weaknesses.** The retry-without-idempotency defect in `lib/api/client.ts` is a frontend-owned reliability bug (REL-001). Client-side-only route protection produces content flash and 401 bursts (ARCH-001). Chat message payloads are handled with type assertions (`msg.payload as { confirmation: ... }`) rather than parsed, so a malformed payload throws at render inside the message loop. Demo constants are rendered in a real user-facing path.

**Recommendations.** Parse message payloads with the Zod schemas that already exist server-side rather than asserting. Add a per-message error boundary so one bad payload cannot blank the conversation.

---

## 11. Backend & API Quality — 83/100 · Confidence HIGH · Evidence STATIC

**Strengths.** This is the most consistently executed layer. One route wrapper with declarative security options. A stable error model — `lib/api/errors.ts` maps nine codes to HTTP statuses, and the frontend translates by code. Zod validation on every input including query parameters. Clean route → service → repository separation. Explicit pagination schemas with their own tests. A v1 deprecation path with deprecation headers and architecture tests enforcing it. `parseJsonWithLimit` applies a body ceiling per route class.

**Weaknesses.** Roughly 55 files carry hardcoded Turkish message strings, which mostly does not matter because the client localizes by code — but leaks wherever a raw message is surfaced (UX-002). `parseJsonWithLimit` claims to reject before buffering, but `request.text()` has already buffered the full payload by the time the check runs, so the memory protection is nominal. The 10 MB chat-analysis limit also exceeds Vercel's 4.5 MB serverless body cap, so oversized uploads produce an opaque platform error rather than the app's own friendly message. Heavy endpoints share the 10-second budget (REL-003).

**Recommendations.** Align `MAX_JSON_BODY_CHAT` with the platform's actual 4.5 MB limit so the app can produce its own error. Enforce the size ceiling from `Content-Length` before reading the body.

---

## 12. Database Quality — 82/100 · Confidence MEDIUM-HIGH · Evidence STATIC

**Strengths.** The schema is disciplined. Composite primary keys are used correctly where they belong — `team_meeting_weeks (user_id, week_start)`, `streak_gem_claims (user_id, claim_key)`, `daily_chest_claims (user_id, utc_date)`, `user_market_inventory (user_id, item_id)` — which gives both correct uniqueness semantics and free index coverage. Single-row-per-user tables use `user_id` as the primary key. Foreign keys consistently specify `ON DELETE CASCADE` to `profiles`, with `ON DELETE RESTRICT` where cascade would be wrong (`market_items`). `CHECK` constraints guard counters and enums on `user_streaks`, `user_usage_counters`, `user_kai_state`, and `daily_chest_claims`. 58 explicit indexes. 69 migrations in consistent order.

*(My initial scan flagged ten tables as missing a `user_id` index; on inspection all ten are covered by primary keys leading with `user_id`. Discarded as a false positive.)*

**Weaknesses.**

**The migration chain cannot build a database from scratch.** `20260703140000_schema_bridge_profiles.sql` runs a top-level `UPDATE public.profiles` that reads five legacy columns — `full_name`, `subscription_tier`, `height`, `weight`, `experience` — and **none of them is created by any migration in the repository**:

```21:32:supabase/migrations/20260703140000_schema_bridge_profiles.sql
update public.profiles
set
  display_name = coalesce(
    nullif(trim(display_name), ''),
    nullif(trim(full_name), ''),
    'User'
  ),
  tier = coalesce(tier, subscription_tier, 'essential'::public.subscription_tier),
  height_cm = coalesce(height_cm, height::smallint),
  weight_kg = coalesce(weight_kg, weight::numeric),
  experience_level = coalesce(experience_level, experience),
  country_code = coalesce(country_code, 'TR'::char(2));
```

PostgreSQL validates column references in a top-level `UPDATE` at parse time, so this fails immediately on any database that does not already carry those legacy columns. The file's own header explains why — it was written as a one-off bridge against the existing production database — but it now sits permanently in the ordered chain. Two later RPCs (`schema_bridge_profiles.sql:76` and `leaderboard_privacy_and_cron_monitor.sql:89`) also read `p.full_name`.

The consequences go well beyond tidiness. **`supabase db reset` fails, so no developer or CI job can provision a clean database from this repository.** That is almost certainly the real reason there are no database-backed tests — TEST-002 is not a matter of discipline but a blocked dependency. It also means disaster recovery cannot be performed from migrations alone, which undercuts the `backup-verification` cron and the disaster-recovery test suite: both verify a restore path whose reproducibility from source has never been exercised. *(DB-001)*

`analytics_daily` is the exception to the constraint discipline and it is the table most exposed to AI-generated values (REL-005). No `FORCE ROW LEVEL SECURITY` anywhere (SEC-007). Two pairs of migrations share identical timestamps (`20260705140000` and `20260704180000`), so ordering depends on filename tiebreak and would silently change if either were renamed. `notifications` declares `UNIQUE (user_id, dedup_key)`, but SQL treats NULLs as distinct, so any notification created without a `dedup_key` bypasses deduplication entirely. The `avatars_public_read` storage policy was dropped in `20260702220000_security_hardening.sql:38` and never recreated — cross-user avatar display now depends solely on the bucket being marked public. And `gem_ledger`, `usage_events`, `domain_events`, `referral_events`, and `billing_events` have no retention rule at all, while every other high-volume table does.

**Growth outlook.** At 100 and 1,000 users nothing here strains. At 10,000, the whole-user-base crons hit the 10-second ceiling (REL-003) and the `ai_usage_ledger` scan on every AI request becomes a visible latency cost (PERF-005). At 100,000, three more bite: `get_global_leaderboard` computes `rank()` over every qualifying row before applying `LIMIT`, so the cost is O(active streaks) regardless of page size (the snapshot cron mitigates reads but not the refresh itself); gem balance is derived by `SUM(amount)` over the full `gem_ledger` on **every** earn, spend, and check-in, against a table with no retention rule; and the export path is unusable for long-lived accounts (PRIV-002). None of these are architectural dead ends — they are addressable with pre-ranked snapshots, a materialized balance column, cursors, and retention windows — but they are cliffs rather than gradients, and they arrive together. *(DB-002, DB-003)*

---

## 13. Observability & Operations — 72/100 · Confidence MEDIUM · Evidence STATIC

**Strengths.** Sentry is wired for server, edge, and client with `onRequestError`, and has a scrubbing layer with tests. `lib/logger.ts` produces structured output with PII redaction. Request IDs are generated in middleware and propagated. `recordCronRun` tracks every cron execution with status and payload. `/api/health` returns detailed dependency status to authenticated cron callers and a bare liveness signal publicly — correct separation. There are SLO tests, incident-severity tests, disaster-recovery tests, and a backup-verification cron.

**Weaknesses.** The environment-validation ordering bug means the highest-severity boot problems are never logged (OPS-001, OPS-002). IP redaction gaps put personal data in logs (SEC-004). No CSP reporting endpoint (SEC-008). The AI health check's circuit breaker is per-instance, so `/api/health` reports a local view rather than a global one (REL-004). I found no alerting configuration in the repository — Sentry captures errors, but nothing evidences that anyone is paged when the Paddle webhook starts failing or a cron stops running.

**Recommendations.** Fix the validation ordering. Add a CSP report endpoint. Define alert rules for webhook failure rate, cron non-execution, AI provider error rate, and rate-limit fail-open events, and check them into the repository so they are reviewable.

---

## 14. Scalability — 74/100 · Confidence MEDIUM · Evidence STATIC

The architecture scales; several specific implementations do not. Redis caching with fail-open behaviour, keyset pagination in the notification cron, a leaderboard snapshot cron instead of live aggregation, and an outbox for async work are all the right patterns.

The cliffs, in the order they will be hit: the 10-second function budget on whole-user-base crons (low thousands of users), the per-request `ai_usage_ledger` scan (proportional to per-user AI usage, so it arrives with engagement rather than headcount), unbounded growth of `chat_messages` and `coaching_memory` with no retention purge, and the unpaginated export path. AI spend is the dominant variable cost and is currently under-metered because secondary model calls bypass quota (AI-003).

---

## 15. Cost Efficiency — 70/100 · Confidence MEDIUM · Evidence STATIC

Real controls exist: platform-wide and per-user daily cost caps, token reservation and settlement, cost-check and cost-alert infrastructure, an admin costs page, and image downscaling before vision calls.

Avoidable recurring cost, roughly in order of size: **unmetered secondary model calls** (AI-003) inflate AI spend by an estimated 2–3× on chat-heavy users and are invisible in per-user accounting; **the check-in POST on every app open** (PERF-003) generates a database write plus three cache invalidations per session; **`cachedWithStale` double-writing** (PERF-006) and the **unconditional Redis pressure-flag write** on every AI request (PERF-005) inflate Upstash command counts, which are billed per command; **339 KB gz of shared JS** (PERF-001) on every cold visit is bandwidth paid on every user acquisition; and **the ledger pagination scan** burns Supabase egress proportional to usage.

---

## 16. SEO & Web Quality — 55/100 · Confidence HIGH · Evidence STATIC

**Confirmed gaps.** There is **no `robots.txt`** — neither `app/robots.ts` nor `public/robots.txt` — and **no `sitemap.xml`**. Crawlers receive no directives at all, and the authenticated `/(app)` routes have no `Disallow`. There is **no OpenGraph or Twitter card metadata** anywhere except a single reference in the pricing page, so every shared Kaify Ai link renders as a bare URL with no image or title card. For a product with a built-in referral system, that is a growth defect, not a cosmetic one. There are no canonical URLs or `hreflang` alternates despite 54 locales, creating duplicate-content ambiguity. `public/index.html` is a stray Capacitor fallback sitting in the web root where it can conflict with routing. And because `generateMetadata` reads cookies (PERF-004), the marketing pages that most need CDN caching are dynamically rendered.

**Recommendations.** Add `app/robots.ts` and `app/sitemap.ts`, add OpenGraph and Twitter metadata with a generated share image to the root layout, add canonical and `hreflang` alternates, remove or relocate `public/index.html`, and move cookie access out of `generateMetadata`.

---

## 17. Developer Experience — 86/100 · Confidence HIGH · Evidence STATIC + TESTED

**Strengths.** Clear repository organization with obvious homes for new code. Comprehensive npm scripts covering i18n, assets, icons, Capacitor sync, Paddle setup, load testing, and legal PDF generation. Two CI workflows. Generated database types. Boot-time environment validation. A tech-debt register with its own test. Consistently useful comments that explain *why* rather than narrating *what* — `lib/supabase/admin.ts` warning that authorization must live in application code, `check-bundle-budget.mjs` explaining why budgets sit above HEAD, `sse.ts` explaining the cancel path exists for quota refund. Zero dead markers.

**Weaknesses.** The coverage number in CI is misleading without reading `vitest.config.ts` (TEST-001). The i18n tooling has drifted from the shipped locale state. Documentation of the KAIOS specs was referenced but not fully traversed in this audit.

---

## 18. Failure Mode Review — 71/100

| Scenario | Behaviour | Assessment |
|---|---|---|
| DeepSeek down | Circuit breaker opens per-instance; error surfaces via SSE `error` event | Partial — breaker is per-process (REL-004), and the error text is hardcoded Turkish (UX-002) |
| Gemini down | Same path for vision; quota refunded | Partial, same caveats |
| Supabase slow | 10s function budget truncates heavy endpoints without a friendly error | Weak (REL-003) |
| Supabase write fails | `rpc-errors.ts` maps to typed errors; route returns coded envelope | Good |
| Network disappears | Offline banner shown; `apiFetch` retries | Weak — retries duplicate mutations (REL-001) |
| SSE disconnects | `cancel()` drives generator `finally`, quota refunded | Good; no resumption, partial reply is lost |
| User double-clicks | Depends on endpoint; no client-side idempotency key | Weak (REL-001) |
| Confirmation arrives twice | Paddle claim/finalize/release handles it | Good |
| Cache is stale | Home bundle stays stale until TTL | **Confirmed defect** (PERF-002) |
| Two requests race | Server-side idempotency store exists but is opt-in | Partial |
| Refresh mid-flow | Onboarding gate resumes; chat history reloads | Good |
| Image upload fails | Placeholder removed, error shown | Good, though possibly in Turkish |
| Auth expires | Middleware refreshes session; client shows session error banner | Good |
| Malformed provider JSON | Greedy regex may capture wrong span or fail | Weak (AI-004) |
| Overly long AI output | Token reserve caps generation | Good |
| Quota exhausted | `LIMIT_80` / `LIMIT_100` warnings on the `done` event | Good — a nice touch |
| Subscription changes mid-session | Tier read per request; out-of-order events can regress state | Partial (REL-006) |

---

# ISSUE REGISTER

Effort key: XS < 1h · S < 4h · M < 1 day · L 1–3 days · XL larger project

## P1 — High (13)

---

**SEC-001 · Service worker navigates to unvalidated push URL**
Severity P1 · Security · Confidence HIGH · Evidence STATIC
**Affected user:** any user with web push enabled
**Affected files:** `public/sw.js`
**Reproduction:** Inspect the `notificationclick` handler; it reads a URL from the push payload and passes it to navigation without origin validation.
**Expected:** Only same-origin URLs are opened.
**Actual:** Any absolute URL in the payload is opened from a trusted-looking app notification.
**Risk:** Phishing and open redirect. A compromised or spoofed payload sends users to an attacker-controlled login page that appears to come from Kaify Ai.
**Root cause:** Missing allowlist on a value that crosses a trust boundary.
**Fix:** Parse the URL and compare `origin` against `self.location.origin`; fall back to the app root on mismatch.
**Effort:** XS · **Regression test:** Unit test the URL resolver with same-origin, cross-origin, protocol-relative, and `javascript:` inputs. · **Blocks release: YES**

---

**SEC-002 · CI supply-chain gate is failing (`nanoid` GHSA-2v37-7h3g-55p8)**
Severity P1 · Security · Confidence HIGH · Evidence TESTED
**Affected files:** `package-lock.json`
**Reproduction:** `npm audit --audit-level=high` → exit code 1, `nanoid@3.3.16`, 1 high severity.
**Expected:** Clean audit; CI audit job green.
**Actual:** Job fails on main.
**Risk:** Low direct exploitability (infinite loop with custom generators at size zero, transitive dependency), but a permanently red gate trains the team to ignore supply-chain signals.
**Fix:** `npm audit fix`; verify the resolved version and re-run.
**Effort:** XS · **Regression test:** Already covered by the CI audit job. · **Blocks release: YES**

---

**SEC-003 · OTP send allows email bombing of arbitrary addresses**
Severity P1 · Security / Abuse · Confidence HIGH · Evidence STATIC
**Affected user:** any third party whose address is targeted; the sending domain's reputation
**Affected files:** `lib/api/rate-guard.ts`, `app/api/auth/otp/send/route.ts`
**Reproduction:** The `otp_send` bucket permits 12 requests per 15 minutes per IP with no per-address limit; the target address is caller-supplied.
**Expected:** Per-address throttling in addition to per-IP.
**Actual:** One IP can send 12 mails per 15 minutes to any address, and rotating IPs scales linearly.
**Risk:** Third-party harassment, deliverability damage, potential blocklisting of the sending domain.
**Fix:** Add a per-hashed-address rate limit bucket (the email hashing helper already exists in `lib/api-security.ts`) alongside the IP bucket.
**Effort:** S · **Regression test:** Extend `tests/unit/rate-guard.test.ts` to assert the address bucket trips independently of the IP bucket. · **Blocks release: YES**

---

**PRIV-001 · Caches are not invalidated on account deletion**
Severity P1 · Privacy / Compliance · Confidence HIGH · Evidence STATIC
**Affected user:** any user exercising erasure rights
**Affected files:** `lib/compliance/deletion-config.ts`, `lib/services/account.service.ts`, `lib/cache/keys.ts`
**Reproduction:** Trace deletion; it covers database tables only. No `CacheKeys.*` entries are deleted from Redis.
**Expected:** All cached personal data is purged with the account.
**Actual:** Session bundles, home bundles, gem balances, streak status, and signed avatar URLs persist — up to 30 minutes for avatars, up to 24 hours for the longest TTLs.
**Risk:** GDPR/KVKK erasure obligation not met; deleted users' data continues to be served.
**Fix:** Add a cache-purge step to the deletion pipeline covering every key namespace for the user.
**Effort:** S · **Regression test:** Extend `tests/compliance/deletion-completeness.test.ts` to assert every `CacheKeys` namespace appears in the purge list. · **Blocks release: YES**

---

**PERF-002 · Home bundle cache is never invalidated for the endpoint that writes it**
Severity P1 · Performance / Correctness · Confidence HIGH · Evidence TESTED (reproduced)
**Affected user:** every user, after every check-in or meal log
**Affected files:** `lib/cache/keys.ts`, `lib/services/home.service.ts`, `lib/services/session.service.ts`, `app/api/home/route.ts`
**Reproduction:** Reproduced with a key-generation script — see the Performance section. Keys written with a `profile` or `tr` locale segment are never targeted by `invalidateHomeBundleCache`, which deletes only `:default`. The `:stale` companions are never deleted either.
**Expected:** Logging a meal updates the home screen immediately.
**Actual:** Stale data persists — up to 300s on the primary key and up to 24 hours via the never-deleted `:stale` companion.
**Risk:** The core feedback loop of a habit-tracking product appears broken. Users repeat actions believing the first attempt failed.
**Fix:** Drop the locale segment from the key (locale affects presentation, not data) or delete all variants including `:stale`.
**Effort:** S · **Regression test:** Extend `tests/architecture/cache-keys.test.ts` to assert every key the write path can produce is covered by the invalidator. · **Blocks release: YES**

---

**REL-001 · API client retries mutations without idempotency keys**
Severity P1 · Reliability · Confidence HIGH · Evidence STATIC
**Affected user:** any user on an unreliable network — i.e. most mobile users
**Affected files:** `lib/api/client.ts`, `lib/api/idempotency.ts`, `lib/api/idempotency-store.ts`
**Reproduction:** `apiFetch` retries POST/PATCH/DELETE on network error. No `Idempotency-Key` header is sent. `withIdempotency` runs the handler uncached when the key is null.
**Expected:** A retried mutation applies at most once.
**Actual:** A request that succeeded but whose response was lost is re-applied. Affects `/api/profile/avatar`, `/api/consent`, `/api/settings`, `/api/analytics`.
**Risk:** Duplicate writes, double gem spend, duplicate consent records.
**Fix:** Generate a UUID key per logical mutation in `apiFetch` and reuse it across retries; the server-side store already handles the rest.
**Effort:** S · **Regression test:** Assert the same key is sent on the retry, and that a second call with the same key returns the cached response. · **Blocks release: YES**

---

**REL-002 · Notification cron is scheduled daily but written for hourly execution**
Severity P1 · Reliability / Product · Confidence HIGH · Evidence STATIC (config vs. code)
**Affected user:** effectively all users outside UTC+12 to UTC+15
**Affected files:** `vercel.json`, `app/api/cron/notifications/route.ts`
**Reproduction:** The route filters on local hour — `STREAK_RISK_HOURS = {19,20,21}`, `WATER_HOURS = {8,10,…,22}`, `WEEKLY_HOURS = {18,19}`, `PRAISE_HOUR = 12` — and its own comment reads "Intended to run hourly." `vercel.json` schedules `"0 6 * * *"`.
**Expected:** Timezone-appropriate notifications for every user.
**Actual:** Streak-risk reminders reach only UTC+13 to UTC+15. Weekly summary only UTC+12/+13. Praise only UTC+6. Water once daily for roughly half of timezones instead of eight times.
**Risk:** The entire retention notification system is inert for nearly the whole user base — a direct hit to D1/D7 retention, which is the core metric for a streak-based product.
**Fix:** Change the schedule to `"0 * * * *"`. Requires a Vercel Pro plan for sub-daily crons.
**Effort:** XS · **Regression test:** A test asserting the cron schedule in `vercel.json` is hourly whenever the route references `localParts`. · **Blocks release: YES**

---

**REL-003 · Whole-user-base jobs and data export capped at 10 seconds**
Severity P1 · Reliability / Scalability · Confidence HIGH · Evidence STATIC
**Affected user:** all users once the base exceeds a few thousand; heavy users immediately for export
**Affected files:** `vercel.json`, `app/api/cron/*/route.ts`, `app/api/profile/export/route.ts`
**Reproduction:** `vercel.json` sets `maxDuration: 10` for `app/api/**/route.ts`. Only the notifications cron overrides it. Every other cron paginates the full user base.
**Expected:** Batch jobs complete or resume cleanly.
**Actual:** Silent mid-run truncation. A partial `retention-purge` leaves data that should have been deleted.
**Risk:** Compliance exposure from incomplete purges, missing leaderboard snapshots, unprocessed outbox events, failed exports.
**Fix:** Raise `maxDuration` for cron paths and add continuation cursors persisted in `cron_job_runs` so a truncated run resumes.
**Effort:** M · **Regression test:** Assert every cron route declares an explicit `maxDuration` above the default. · **Blocks release: YES**

---

**UX-001 · Six shipped locales are approximately 82% untranslated English**
Severity P1 · UX / Product · Confidence HIGH · Evidence TESTED (corpus diff)
**Affected user:** every user selecting pt, nl, pl, ru, ko, or zh-CN; partially ja
**Affected files:** `lib/lang/{pt,nl,pl,ru,ko,zh-CN,ja}.json`, `lib/i18n/reviewed-locales.ts`
**Reproduction:** Diff each locale against `en.json` over the 829 substantive strings. Result: pt/nl/pl/ru/ko/zh-CN at 82% identical to English, ja at 52%. Confirmed samples include `offline.banner`, `contact.kai.preview`, and the entire `landing.*` namespace.
**Expected:** A locale in the picker is translated.
**Actual:** Users get an English landing page, English coach previews, and English system messages under a native-language label.
**Risk:** Product appears broken or machine-assembled in six markets; refund and churn risk from paying users.
**Fix:** Run `npm run i18n:retranslate:priority` to completion and verify with a corpus diff, or narrow `REVIEWED_LANG_OPTIONS` to genuinely translated locales.
**Effort:** M (tooling exists) · **Regression test:** Widen the priority-locale assertion in `tests/compliance/i18n-quality.test.ts` to the full corpus with a reviewed allowlist. · **Blocks release: YES**

---

**A11Y-001 · Chat streaming is silent to screen readers**
Severity P1 · Accessibility · Confidence HIGH · Evidence STATIC
**Affected user:** all screen reader users
**Affected files:** `components/chat/LiveChatPanel.tsx`
**Reproduction:** The message list container has no `aria-live` and no `role="log"`. The typing indicator is three unlabeled spans. Only four files in the codebase use `aria-live`; none is the chat.
**Expected:** Incoming replies and typing status are announced.
**Actual:** Nothing is announced. The primary interaction of the product is inaccessible.
**Risk:** WCAG 2.2 4.1.3 failure on the core feature; legal exposure in the EU market the app targets.
**Fix:** Add `role="log" aria-live="polite" aria-relevant="additions text"` to the list, an `sr-only` label to the typing indicator, and author attribution to each message's accessible name.
**Effort:** S · **Regression test:** Playwright assertion that the live region exists and receives the streamed text. · **Blocks release: YES**

---

**TEST-001 · Coverage gate measures 5.2% of the codebase**
Severity P1 · Testing · Confidence HIGH · Evidence TESTED (measured)
**Affected files:** `vitest.config.ts`
**Reproduction:** `coverage.include` lists 34 files totalling 2,322 LOC against 498 files and 44,584 LOC. Zero API routes, zero components, zero pages, one of 45 services.
**Expected:** The coverage number reflects the application.
**Actual:** "86%" describes 5.2% of the code; effective coverage is roughly 4.5%.
**Risk:** False confidence — the number is used as a release signal and does not support that use.
**Fix:** Expand `include` to `lib/**` and `app/api/**`, reset thresholds to the honest baseline, and ratchet upward.
**Effort:** S to change, L to reach a meaningful number · **Regression test:** The threshold itself. · **Blocks release: YES** (as a gate on the release decision, not as a code change)

---

**TEST-002 · No test executes SQL against a database**
Severity P1 · Testing / Security · Confidence HIGH · Evidence TESTED
**Affected files:** `tests/security/rls-policies.test.ts`, all of `tests/`
**Reproduction:** No Postgres connection, Supabase local startup, or testcontainer usage anywhere in `tests/`. The RLS test regex-matches migration text.
**Expected:** Cross-user isolation is proven at runtime.
**Actual:** 44 tables and 43 definer functions are verified only by string matching.
**Risk:** A policy regression (`USING (true)`) ships green. This is the largest unverified assumption in the product.
**Fix:** Add `supabase start` to CI and write authorization tests authenticating as two distinct users, asserting denial on every table.
**Effort:** L · **Regression test:** The suite itself. · **Blocks release: YES**

---

**OPS-001 · Boot-time environment validation never reports its critical findings**
Severity P1 · Operations · Confidence HIGH · Evidence STATIC
**Affected files:** `lib/startup/validate-env.ts`
**Reproduction:** `logger.error("env validation failed (critical)", { problems })` executes at line 48. Checks for missing `CRON_SECRET`, `CSRF_SECRET`, `ADMIN_HUB_PASSWORD`, `ADMIN_HUB_SECRET`, and `PADDLE_NOTIFICATION_WEBHOOK_SECRET` push into `problems` at lines 58–82, after that log has run. Nothing reads the array again.
**Expected:** Deploying without a CSRF secret logs a loud error.
**Actual:** Only the soft "optional vars missing" warning appears.
**Risk:** A production deploy missing security-critical configuration looks healthy at boot, and the failure surfaces later as user-visible errors.
**Fix:** Move the production checks above the error log, or re-evaluate `problems.length` after all checks.
**Effort:** XS · **Regression test:** Unit test asserting `logger.error` is called when `CSRF_SECRET` is absent in production. · **Blocks release: YES**

---

**DB-001 · Migration chain cannot build a database from scratch**
Severity P1 · Database / Reliability / DX · Confidence HIGH · Evidence TESTED (static verification)
**Affected user:** every developer; disaster recovery; all CI database testing
**Affected files:** `supabase/migrations/20260703140000_schema_bridge_profiles.sql`, `20260704190000_leaderboard_privacy_and_cron_monitor.sql`
**Reproduction:** `20260703140000` line 21 runs a top-level `UPDATE public.profiles` referencing `full_name`, `subscription_tier`, `height`, `weight`, and `experience`. Searching all 69 migrations confirms none of the five columns is ever created. PostgreSQL validates a top-level `UPDATE` at parse time, so the statement errors on a clean database.
**Expected:** `supabase db reset` provisions a working schema from source.
**Actual:** Migration 33 of 69 fails. The chain only succeeds against the pre-existing production database that already carries the legacy columns.
**Risk:** No clean local or CI database can be provisioned, which blocks the database-backed authorization testing this audit identifies as the single most important gap (TEST-002). Disaster recovery from migrations alone is not possible, which weakens the guarantee the `backup-verification` cron and disaster-recovery tests appear to provide.
**Root cause:** A one-off production bridge script was committed into the ordered migration chain rather than run out-of-band.
**Fix:** Guard the backfill behind `information_schema.columns` existence checks (or a `DO` block), and add the legacy columns as nullable no-ops so the chain is reproducible. Then verify with `supabase db reset` in CI.
**Effort:** M · **Regression test:** A CI job that runs `supabase db reset` against a clean Postgres and fails on error. · **Blocks release: YES** — not for end users, but it blocks the remediation plan and disaster recovery.

---

**A11Y-006 · Form labels not programmatically associated across auth and onboarding**
Severity P1 · Accessibility · Confidence HIGH · Evidence STATIC
**Affected user:** all screen reader users, during mandatory onboarding
**Affected files:** `components/onboarding/OnboardingProfileForm.tsx`, `components/ProfileModal.tsx`, `components/auth/SignupWizard.tsx`, `components/auth/EmailOtpLogin.tsx`, `components/auth/StepUpChallenge.tsx`
**Reproduction:** `OnboardingProfileForm.tsx:147-155` — `<label>` with no `htmlFor`, `<input>` with no `id`. Pattern repeats across every field in the form and the other four files.
**Expected:** Each input has a programmatic accessible name; errors are linked via `aria-describedby` and flagged with `aria-invalid`.
**Actual:** Screen readers announce unlabeled edit fields; validation errors are not associated with the field that failed.
**Risk:** WCAG 1.3.1 and 3.3.2 failures on the sign-up and onboarding path, which is not skippable. A blind user cannot reliably complete registration.
**Fix:** Add `id`/`htmlFor` pairs, wire `aria-describedby` to error nodes, set `aria-invalid` on failure.
**Effort:** M · **Regression test:** axe-core assertions on the onboarding and signup routes. · **Blocks release: YES**

---

**UX-005 · Failed chat send leaves the user's message on screen as if delivered**
Severity P1 · UX / Trust · Confidence HIGH · Evidence STATIC
**Affected user:** any user on an unreliable network
**Affected files:** `components/chat/LiveChatPanel.tsx` (lines 220–231)
**Reproduction:** On send error the handler filters out the coach placeholder but leaves the user bubble in `messages`.
**Expected:** The message is marked failed with a retry affordance, or removed.
**Actual:** It renders identically to a delivered message. The inline error is dismissible and easily missed on mobile.
**Risk:** Users believe they have told their coach something they have not — for a product built on coaching continuity, this directly erodes trust. It also drives duplicate sends.
**Fix:** Add a `failed` state to the message model, render it distinctly, and offer retry.
**Effort:** S · **Regression test:** Component test asserting a failed send renders the failed marker and retains no delivered styling. · **Blocks release: YES**

---

## P2 — Medium (46)

| ID | Title | Category | Files | Effort | Blocks |
|---|---|---|---|---|---|
| SEC-004 | Logger PII redaction misses `ip`, `clientIp`, `ipAddress`; middleware logs plaintext IPs | Security/Privacy | `lib/logger.ts`, `middleware.ts` | XS | NO |
| SEC-005 | No live authorization tests (duplicate view of TEST-002 from the security lens) | Security | `tests/security/` | L | NO |
| SEC-006 | `billing_events` retains full Paddle PII payloads with no retention rule | Privacy | `lib/services/billing.service.ts`, `lib/compliance/retention-config.ts` | S | NO |
| SEC-007 | No `FORCE ROW LEVEL SECURITY`; table owner bypasses RLS | Security | `supabase/migrations/` | S | NO |
| SEC-009 | Public leaderboard exposes raw user UUIDs to unauthenticated callers | Security | `lib/services/leaderboard.service.ts` | S | NO |
| PRIV-002 | Data export is unpaginated `select *` across ~24 tables inside a 10s budget | Privacy/Reliability | `lib/services/account.service.ts` | M | NO |
| PERF-001 | 339 KB gz core shared JS; 114 KB gz middleware bundle | Performance | build output, `middleware.ts` | L | NO |
| PERF-003 | Cold app open costs three round trips including a POST write | Performance | `lib/session-context.tsx`, `app/(app)/welcome/page.tsx` | M | NO |
| PERF-004 | `generateMetadata` reads cookies → every route dynamic, no CDN caching | Performance/SEO | `app/layout.tsx` | M | NO |
| PERF-005 | Per-request paginated scan of `ai_usage_ledger` on the AI hot path | Performance | `lib/ai/daily-cost-cap.ts` | M | NO |
| PERF-006 | `cachedWithStale` writes the stale key on every fresh read | Performance/Cost | `lib/cache.ts` | XS | NO |
| PERF-007 | Signed avatar URL cached 30 min with no invalidation on upload | Performance/UX | `lib/services/avatar-storage.service.ts` | XS | NO |
| REL-004 | Circuit breakers hold per-instance in-memory state on serverless | Reliability | `lib/resilience/circuit.ts`, `lib/ai/circuit-breaker.ts` | M | NO |
| REL-005 | `analytics_daily` has no `CHECK` constraints, unlike peer tables | Data integrity | `supabase/migrations/20260803180000_faz1_integrity.sql` | S | NO |
| REL-006 | Out-of-order Paddle events can regress subscription state | Reliability/Billing | `lib/services/billing.service.ts` | M | NO |
| AI-001 | `PHONE_PATTERN` redacts legitimate fitness numerics ("180 75 25") and dates | AI | `lib/ai/prompt-safety.ts` | S | NO |
| AI-002 | Extracted analytics persisted without range validation | AI/Data integrity | `lib/ai/coach-analytics.ts` | S | NO |
| AI-003 | Structured-card and analytics model calls bypass user quota accounting | AI/Cost | `lib/ai/quota-guard.ts`, `lib/ai/structured-chat.ts` | M | NO |
| UX-002 | Turkish server strings surface to non-Turkish users (SSE error, photo path) | UX/i18n | `lib/api/sse.ts`, `components/chat/LiveChatPanel.tsx` | S | NO |
| UX-003 | Demo profile and gem values render pre-auth on `/welcome` | UX | `app/(app)/welcome/page.tsx` | S | NO |
| A11Y-002 | `text-zinc-500` 4.10:1 (130 uses) and `text-zinc-600` 2.56:1 (38 uses) fail AA | Accessibility | app-wide | M | NO |
| A11Y-003 | Accessibility gate covers only 4 unauthenticated pages; perf assertion is warn-only | Accessibility | `lighthouserc.cjs` | M | NO |
| A11Y-004 | Background not `inert`/`aria-hidden` behind modals | Accessibility | `components/ui/MotionDialog.tsx` | S | NO |
| TEST-003 | E2E covers only unauthenticated smoke; auth journeys behind an unset flag | Testing | `e2e/`, `.github/workflows/ci.yml` | L | NO |
| TEST-004 | `i18n-quality` passes while six shipped locales are 82% English | Testing | `tests/compliance/i18n-quality.test.ts` | S | NO |
| SEO-001 | No `robots.txt`, no `sitemap.xml` | SEO | `app/` | XS | NO |
| SEO-002 | No OpenGraph/Twitter metadata; referral shares render bare | SEO/Growth | `app/layout.tsx` | S | NO |
| ARCH-001 | Protected pages gate on the client with no server-side redirect | Architecture/UX | `app/(app)/layout.tsx` | S | NO |
| SEC-011 | `trg_unlock_team_chat_on_streak` sets `search_path = public`, not `''` | Security | `20260630190000_phase8_analytics_market_team.sql:171` | XS | NO |
| SEC-012 | `avatars_public_read` storage policy dropped and never recreated; cross-user avatars rely on bucket-public flag alone | Security | `20260702220000_security_hardening.sql:38` | S | NO |
| AI-005 | Client disconnect does not abort the upstream provider call; tokens burn until the 60s timeout | AI/Cost | `lib/services/chat.service.ts:318-322` | S | NO |
| AI-006 | Team chat omits security preamble, canary, injection detection, output scrub, and `requireTermsConsent` | AI/Security | `lib/services/team-chat.service.ts`, `app/api/chat/team/route.ts` | M | NO |
| AI-007 | Coach history turns re-enter the prompt unsanitized and unwrapped | AI/Security | `lib/services/chat.service.ts:265-271` | S | NO |
| AI-008 | Malformed image-quality score defaults to 7, above the rejection threshold | AI/Cost | `lib/validations/analysis.schema.ts:101-104` | XS | NO |
| AI-009 | Daily AI token cap reads a ledger written asynchronously after the call — concurrent requests can overshoot | AI/Cost | `lib/ai/daily-cost-cap.ts`, `lib/ai/usage-ledger.ts` | M | NO |
| AI-010 | Team chat inserts hardcoded English fallback copy on JSON parse failure, ignoring locale | AI/i18n | `lib/services/team-chat.service.ts:172-175` | XS | NO |
| DB-002 | `get_global_leaderboard` computes `rank()` over all qualifying rows before `LIMIT` | Database/Scale | `20260704190000_leaderboard_privacy_and_cron_monitor.sql:84-100` | M | NO |
| DB-003 | Gem balance derived by `SUM(gem_ledger)` on every earn/spend/check-in; ledger has no retention | Database/Scale | `20260630140000_gamification_core.sql:273-274` | M | NO |
| DB-004 | `gem_ledger`, `usage_events`, `domain_events`, `referral_events`, `billing_events` have no retention rule | Database/Privacy | `lib/compliance/retention-config.ts` | M | NO |
| DB-005 | Two pairs of migrations share identical timestamps; ordering depends on filename tiebreak | Database/Hygiene | `20260705140000_*`, `20260704180000_*` | S | NO |
| DB-006 | `notifications` UNIQUE `(user_id, dedup_key)` does not dedupe when `dedup_key` is NULL | Database | `20260702190000_notifications.sql:43` | XS | NO |
| UX-006 | Leaderboard fetch failure renders the empty state instead of an error | UX | `app/(app)/leaderboard/page.tsx:226-228` | XS | NO |
| UX-007 | Analytics confirmation card has no `catch`; failures are silent | UX | `components/chat/AnalyticsConfirmationCard.tsx:23-35` | XS | NO |
| UX-008 | Guest photo flow simulates analysis with a success toast and no backend call | UX/Trust | `app/(app)/chat/[id]/page.tsx:248-260` | S | NO |
| UX-009 | `FirstTaskChecklist` marks the chat task complete on link click, not on message sent | UX | `app/(app)/welcome/page.tsx:217-221` | XS | NO |
| UX-010 | Hardcoded Turkish section headers in the daily-summary rich card | UX/i18n | `components/chat/ChatRichCard.tsx:281-304` | S | NO |
| UX-011 | Logout executes immediately with no confirmation | UX | `app/(app)/settings/page.tsx:240-246` | XS | NO |
| A11Y-007 | Duplicate OTP inputs bound to the same state; double tab stop and double announcement | Accessibility | `components/auth/EmailOtpLogin.tsx:267-288` | XS | NO |
| A11Y-008 | Chat has no `<main>`/`<h1>`; settings and leaderboard have no `<h1>`; `AppHeader` title is a `<div>` | Accessibility | `app/(app)/chat/[id]/page.tsx`, `components/navigation/AppHeader.tsx:48` | S | NO |
| A11Y-009 | Touch targets below 44px on streak claim and notification close, despite a `.touch-44` utility existing | Accessibility | `components/StreakRoad.tsx:278-284`, `components/notifications/NotificationCenter.tsx:187-194` | S | NO |
| A11Y-010 | Settings toggles have `aria-pressed` but no `aria-label`; language picker lacks `aria-expanded`/`aria-haspopup` | Accessibility | `app/(app)/settings/page.tsx:447-490` | S | NO |

## P3 — Low (8)

| ID | Title | Category | Effort |
|---|---|---|---|
| SEC-008 | CSP has no `report-uri`/`report-to`; violations invisible | Security | XS |
| SEC-010 | reCAPTCHA ignores score, hostname, and remote IP | Security | S |
| AI-004 | Greedy `/\{[\s\S]*\}/` JSON extraction from model output | AI | S |
| UX-004 | Nine-code error map too coarse to give actionable guidance | UX | M |
| A11Y-005 | ~59 physical `left-`/`right-` utilities break Arabic RTL mirroring | Accessibility | M |
| OPS-002 | `DAILY_CHEST_LIMIT_ENABLED=false` production guard never surfaced (same root cause as OPS-001) | Operations | XS |
| SEO-003 | No canonical or `hreflang` alternates across 54 locales | SEO | S |
| SEO-004 | Stray `public/index.html` Capacitor fallback in the web root | Hygiene | XS |
| A11Y-011 | Leaderboard `podiumRise` and inline streak animations bypass the global reduced-motion block | Accessibility | S |
| A11Y-012 | Rich cards and score bars are `<div>`-only data visualizations with no text alternative | Accessibility | M |

**Totals: P0 = 0 · P1 = 16 · P2 = 46 · P3 = 10 · 72 issues**

*Issues DB-001 through DB-006, AI-005 through AI-010, UX-005 through UX-011, A11Y-006 through A11Y-012, SEC-011 and SEC-012 were added after dedicated deep-dive passes on the database, AI, and accessibility/UX subsystems completed. They also corrected two claims in the original draft: the `search_path` statement now carries its exception, and `coaching_memory` is in fact covered by the 24-month retention purge.*

---

# PRIORITIZED REMEDIATION PLAN

## FIX BEFORE LAUNCH

Ordered by risk, with the cheap high-impact items first so they land immediately.

1. **REL-002** — Change the notification cron to hourly. *(XS — one line, restores the entire retention system)*
2. **SEC-002** — `npm audit fix`; get the supply-chain gate green. *(XS)*
3. **OPS-001 / OPS-002** — Move the production checks above the error log in `validate-env.ts`. *(XS)*
4. **SEC-001** — Validate the notification URL origin in `public/sw.js`. *(XS)*
5. **PERF-002** — Fix home-bundle cache invalidation, including `:stale` keys. *(S)*
6. **PRIV-001** — Purge Redis caches on account deletion. *(S)*
7. **REL-001** — Send and reuse an `Idempotency-Key` across client retries. *(S)*
8. **A11Y-001** — Add the chat live region and label the typing indicator. *(S)*
9. **SEC-003** — Add a per-address OTP send limit. *(S)*
10. **A11Y-007** — Delete the duplicate OTP input. *(XS)*
11. **UX-005** — Mark failed chat sends as failed and offer retry. *(S)*
12. **UX-006 / UX-007 / UX-008** — Distinguish fetch errors from empty states, add the missing `catch`, and stop faking guest photo analysis. *(S combined — same class of trust defect)*
13. **UX-001** — Complete the priority-locale translations, or narrow the picker. *(M — narrowing is XS if translation slips)*
14. **REL-003** — Raise cron `maxDuration` and add resume cursors. *(M)*
15. **A11Y-006** — Associate labels with inputs across auth and onboarding. *(M)*
16. **DB-001** — Repair the migration chain so `supabase db reset` works. *(M — do this before TEST-002, which depends on it)*
17. **TEST-002** — Stand up database-backed authorization tests. *(L — the one large item, and the one that prevents recurrence)*

**TEST-001** is a release *decision* gate rather than a code change: expand the coverage scope so the number stops being misleading, and accept the honest baseline before signing off.

## FIX DURING FIRST WEEK

SEC-004 (IP redaction), SEC-006 (billing PII retention), SEC-009 (leaderboard UUIDs), UX-002 and UX-010 (Turkish strings), UX-003 (demo data), UX-009 (checklist false completion), AI-001 (phone regex), AI-002 (analytics validation), AI-005 (abort upstream on disconnect), AI-006 (team-chat security parity), AI-008 (quality-score default), REL-005 (analytics constraints), PERF-006 and PERF-007 (cheap cache fixes), SEO-001 and SEO-002 (robots, sitemap, OpenGraph), TEST-004 (widen the i18n assertion), ARCH-001 (server-side route protection), A11Y-008 (landmarks and headings), DB-006 (NULL dedup key).

## FIX DURING FIRST MONTH

PERF-004 (static marketing rendering), PERF-005 (AI budget aggregate), PERF-003 (app-open round trips), REL-004 (shared circuit breaker), REL-006 (Paddle event ordering), AI-003 (meter secondary calls), AI-007 (sanitize coach history), AI-009 (token cap race), PRIV-002 (streamed export), A11Y-002 (contrast sweep), A11Y-003 (authenticated a11y gate), A11Y-004 (inert backgrounds), A11Y-009 and A11Y-010 (touch targets, toggle labels), TEST-003 (authenticated E2E), SEC-005 and SEC-007 (RLS hardening), SEC-011 and SEC-012 (search_path, avatar policy), DB-004 (retention for the five uncovered tables), DB-005 (migration timestamp collisions), UX-011 (logout confirmation).

## BACKLOG / POLISH

PERF-001 (bundle reduction — a real project, not a fix), UX-004 (error taxonomy), A11Y-005 (RTL logical properties), A11Y-011 and A11Y-012 (reduced motion, chart alternatives), SEC-008 (CSP reporting), SEC-010 (reCAPTCHA depth), AI-004 (JSON parsing), AI-010 (team-chat fallback locale), SEO-003 (canonicals), SEO-004 (stray file), DB-002 and DB-003 (leaderboard ranking and gem balance materialization — schedule against growth, not calendar), AI behavioural evaluation suite.

---

# TOP 10 QUICK WINS

Maximum product quality per engineering hour.

| # | Fix | ID | Effort | Why it pays |
|---|---|---|---:|---|
| 1 | Change notification cron to `"0 * * * *"` | REL-002 | XS | One line reactivates the entire retention notification system for ~95% of users |
| 2 | `npm audit fix` | SEC-002 | XS | Turns the supply-chain gate green so it stays trustworthy |
| 3 | Reorder `validate-env.ts` | OPS-001 | XS | Makes a missing production secret loud instead of silent |
| 4 | Validate SW notification origin | SEC-001 | XS | Closes the most dangerous confirmed finding |
| 5 | Delete the duplicate OTP input | A11Y-007 | XS | Removes a double tab stop and double announcement from the login path |
| 6 | Add the missing `catch` in `AnalyticsConfirmationCard` | UX-007 | XS | Stops a silent failure on the primary data-entry confirmation |
| 7 | Invalidate `avatarSigned` on upload | PERF-007 | XS | Removes a visible 30-minute "my change didn't save" bug |
| 8 | Distinguish leaderboard fetch error from empty | UX-006 | XS | Stops presenting an outage as "nobody is on the leaderboard" |
| 9 | Fix home-bundle cache invalidation | PERF-002 | S | Repairs the core feedback loop of a habit-tracking product |
| 10 | Add chat `role="log"` + `aria-live` | A11Y-001 | S | Makes the primary feature usable with a screen reader |

Also XS and worth taking in the same pass: `npm audit fix` aside, stop double-writing in `cachedWithStale` (PERF-006), add `app/robots.ts` and `app/sitemap.ts` (SEO-001), add OpenGraph metadata to the root layout (SEO-002), and raise the image-quality parse fallback below the rejection threshold (AI-008).

Items 1 through 8 total well under a day and remove four P1s.

---

# SECURITY SUMMARY

**SECURITY SCORE: 82/100**

- **P0 count:** 0
- **P1 count:** 3 (SEC-001, SEC-002, SEC-003)
- **P2 count:** 8 (SEC-004, SEC-005, SEC-006, SEC-007, SEC-009, SEC-011, SEC-012, PRIV-002)
- **P3 count:** 2 (SEC-008, SEC-010)

Adjacent AI-security findings are tracked under AI-006 (team chat omits the security preamble, canary, injection detection, output scrubbing, and terms-consent guard that the main chat path applies) and AI-007 (assistant history re-enters the prompt unsanitized).

**Most dangerous plausible attack:** Push-notification phishing via the service worker. An attacker who can influence a notification payload — through a compromised admin broadcast path, an injected value in a notification-generating flow, or a leaked push endpoint — delivers a notification that looks native to the app and navigates to an attacker-controlled credential page on click. Because the notification carries the app's icon and name, the usual phishing cues are absent. The attack requires no code execution in the app and no CSP bypass.

**Most exposed surface:** The AI chat endpoint. It accepts free-form user text, forwards it to third-party providers, stores derived state in memory and analytics, and drives database writes through the confirmation flow. Prompt-safety mitigations are layered and thoughtful, but the surface is inherently the widest in the product and the validation gap at the end of the pipeline (AI-002) means model output reaches persistent storage with insufficient checking.

**Strongest protection:** The database authorization layer. RLS enabled on 44 of 44 tables, `search_path` set on 43 of 43 `SECURITY DEFINER` functions (one to `public` rather than `''`, and revoked from client roles — SEC-011), deny-all-by-default on internal tables, and a single centralized route wrapper that makes forgetting authentication require deliberate effort. The design is right; only the runtime verification is missing — and DB-001 explains why it is missing, since no clean database can currently be provisioned to test against.

**Top three fixes:** (1) Validate the service-worker notification origin. (2) Clear the `nanoid` advisory so the supply-chain gate is meaningful again. (3) Stand up database-backed cross-user authorization tests so the strongest part of the system is actually proven rather than assumed.

---

# PERFORMANCE SUMMARY

**PERFORMANCE SCORE: 68/100**

**Largest frontend bottleneck:** 339 KB gzipped of core shared JavaScript — roughly 1.1 MB parsed — downloaded and executed before hydration on every cold visit, plus a 114 KB gz middleware bundle on every request.

**Largest backend bottleneck:** The per-request paginated scan of `ai_usage_ledger` in `assertUserDailyAiBudget`, sitting on the hot path of the product's most latency-sensitive operation and growing with usage.

**Largest AI bottleneck:** Unmetered secondary model calls. Structured-card generation and analytics extraction each add a full model round trip after the primary reply, inflating both perceived latency and cost without appearing in quota accounting.

**Largest database risk:** The 10-second function ceiling on jobs that iterate the entire user base. This will begin failing silently in the low thousands of users, and a truncated retention purge is a compliance problem rather than merely an operational one.

**Largest scalability risk:** Several cliffs arrive together around 10,000 users — cron truncation, ledger scan cost, full-table `rank()` on the leaderboard, `SUM(gem_ledger)` on every gem operation against a table with no retention, and export timeouts. None is architecturally fatal, but they compound.

**Quickest performance win:** Fix home-bundle cache invalidation (PERF-002). It is a small change that repairs a correctness bug users will actually notice, and it makes the existing cache do the job it was built for.

**Most important long-term performance fix:** Reduce the shared JavaScript baseline. The current budget was set above HEAD specifically so it would not fail, which means the gate can prevent decay but cannot drive improvement. Establishing a real target and route-level code splitting is the difference between an app that feels fast on a mid-tier Android and one that does not.

---

# UX SUMMARY

**UX SCORE: 66/100**

**Top friction:** Selecting a supported language and receiving an English app. Six of sixteen picker options are approximately 82% untranslated.

**Most confusing workflow:** First app open. The welcome screen renders demo profile data and default gem values while the session resolves, so a new or slow-connection user sees plausible but fabricated numbers with no indication they are placeholders — and no way to distinguish them from real data once it loads.

**Weakest error state:** Mid-stream chat failure. The user sees a hardcoded Turkish sentence regardless of their locale, with no retry affordance, no explanation of whether their message was saved — and the message itself stays on screen looking delivered (UX-005).

**Where a user can believe something worked when it did not:** Four confirmed instances — failed chat send (UX-005), leaderboard error rendered as empty (UX-006), silent analytics-confirmation failure (UX-007), and the fabricated guest photo analysis (UX-008). Treat these as one workstream; they share a root cause in error handling that resolves loading state without distinguishing failure from emptiness.

**Best user journey:** Photo-analysis consent. The gate intercepts the upload, explains what will happen, stores the pending file, and resumes automatically on acceptance rather than making the user re-pick the image. It is a genuinely well-designed consent flow — most products make this hostile.

**Most important pre-launch UX fix:** Resolve the locale situation (UX-001). Shipping nine honestly-translated languages is strictly better than sixteen where six are English, and narrowing the picker takes minutes if translation cannot be completed in time.

---

# ACCESSIBILITY SUMMARY

**ACCESSIBILITY SCORE: 58/100**

**Critical blockers:** Two. The chat message list has no live region, so streaming AI replies are entirely unannounced to screen readers — the product's primary interaction is inaccessible. And form inputs across signup, onboarding, profile editing, and the OTP flow have visual labels with no programmatic association (A11Y-006), so the mandatory registration path presents a series of unlabeled edit fields.

**Keyboard issues:** Focus management inside dialogs is genuinely good — a real trap with Tab cycling, Escape handling that respects dialog stacking, and focus restoration on close. Outside dialogs, the chat composer and message list have no keyboard-reachable path to older messages beyond the render window, background content remains in the tab order's reach for browse-mode navigation, and the OTP screen contains two inputs for the same code (A11Y-007), so keyboard users traverse it twice.

**Screen-reader issues:** No live region on the chat (A11Y-001). Typing indicator is three unlabeled spans. Messages lack list semantics and author attribution, so a screen reader cannot distinguish who said what. Only four files in the entire codebase use `aria-live`. Chat has no `<main>` or `<h1>`, and `AppHeader` renders every page title into a `<div>`, so heading navigation does not work anywhere (A11Y-008).

**Contrast issues:** Measured against `#0a0a0a` — `text-zinc-500` at 4.10:1 across 130 usages fails AA for normal text, and `text-zinc-600` at 2.56:1 across 38 usages fails AA for both normal and large text. `text-zinc-400` (168 usages, 7.72:1) and opacity-based timestamps (7.30:1) pass.

**Dynamic-content issues:** Streaming text, structured cards, analytics confirmation cards, and the meal and posture analysis results all render without any announcement mechanism. The toast system does this correctly with both polite and assertive regions — that same pattern needs to reach the chat surface.

---

# ARCHITECTURE SUMMARY

**ARCHITECTURE SCORE: 80/100**

**Strongest architectural choice:** Centralizing every cross-cutting security concern in `lib/api/route-handler.ts`. Authentication, MFA step-up, rate limiting, CSRF, consent, and AI budget are declared per route as configuration rather than reimplemented per handler. This is why the security review found so few gaps across 99 routes — the wrapper makes the secure path the default path, and it is the decision most responsible for the product's overall security score.

**Largest technical debt:** The verification layer. The implementation is consistently more sophisticated than the tests that confirm it — 44 RLS-protected tables verified by regex, 99 route handlers with zero coverage measurement, and a coverage number that describes 5.2% of the code. The debt is not messy code; it is unproven code. DB-001 is the keystone: because the migration chain cannot build a clean database, the integration layer that would prove any of it cannot be built either. Repairing the chain is the unlock for the entire verification effort.

**Largest scaling concern:** The convergence of the 10-second function budget with jobs that iterate the full user base. It is invisible today and arrives suddenly, and the retention purge failing partway is a compliance event rather than a performance one.

**Most dangerous coupling:** The AI extraction pipeline writing to `analytics_daily` without validation at either end. `coach-analytics.ts` does not bound extracted values, and the table lacks the `CHECK` constraints its sibling tables all have. Model output therefore reaches canonical user statistics through two layers that each assumed the other was checking.

**Recommended next architectural investment:** A database-backed integration test layer. It closes the largest unverified assumption (RLS), it is the only thing that would have caught several of the defects in this report before they shipped, and every subsequent hardening effort compounds on it. Build that before optimizing bundles or refactoring anything else.

---

# LAUNCH GATE

```
P0_OPEN:
0

P1_OPEN:
16

P2_OPEN:
46

P3_OPEN:
10

SECURITY_SCORE:
82/100

PERFORMANCE_SCORE:
68/100

ACCESSIBILITY_SCORE:
58/100

UX_SCORE:
66/100

RELIABILITY_SCORE:
70/100

AI_KAIOS_SCORE:
71/100

OVERALL_SCORE:
71/100

RELEASE_RECOMMENDATION:
READY_WITH_FIXES

TOP_5_BEFORE_LAUNCH:
1. REL-002 — Change the notification cron from daily to hourly; the entire retention notification system is currently inert for ~95% of users. (XS)
2. UX-001 — Complete translations for pt/nl/pl/ru/ko/zh-CN or remove them from the picker; six shipped languages are ~82% English. (M, or XS to narrow)
3. PERF-002 + PRIV-001 — Fix home-bundle cache invalidation and purge Redis on account deletion; one breaks the core feedback loop, the other is an erasure-compliance defect. (S each)
4. SEC-001 + SEC-002 + SEC-003 — Validate the service-worker notification origin, clear the nanoid advisory so the supply-chain gate is green, and add per-address OTP throttling. (XS/XS/S)
5. DB-001 then TEST-002 — Repair the migration chain so `supabase db reset` works, then stand up database-backed cross-user authorization tests. 44 RLS tables and 43 SECURITY DEFINER functions are currently verified only by regex over migration text, and the missing test layer is blocked on the broken chain. (M then L)

ALSO_BEFORE_LAUNCH:
- UX-005/006/007/008 — Four states report success or silence on failure; fix as one workstream. (S combined)
- A11Y-006 + A11Y-007 — Associate form labels across auth and onboarding; delete the duplicate OTP input. (M + XS)
```

---

## AUDIT COVERAGE AND LIMITATIONS

Stated plainly so that "not tested" is never mistaken for "pass."

**Executed and measured (TESTED):** Full Vitest suite with coverage (91 files, 488 tests, all passing). Coverage scope measured against the real codebase. `npm audit` with exit-code verification. Bundle budget gate against the production build. RLS, policy, `SECURITY DEFINER`, and index coverage extracted from all 69 migrations. WCAG contrast computed for every high-frequency text token. All 54 locale corpora diffed against English. Home-bundle cache key generation reproduced. Translation key parity verified across all locales.

**Statically reviewed in depth (STATIC):** Middleware and the full request pipeline. The route-handler wrapper, auth guard, CSRF, CSP, rate limiting, and API security helpers. Billing and Paddle webhook handling. Account deletion and export. The AI stack — prompt safety, quota guard, cost caps, structured chat, coach analytics, model routing, memory. Caching layers and key registry. Session and home services. Image handling and avatar storage. The dialog primitive, chat panel, and welcome page. All cron routes, `vercel.json`, both CI workflows, and the Lighthouse configuration.

**Not tested (explicit gaps that should be closed before final sign-off):**
- **No live authenticated environment.** Real LCP, INP, CLS, and TTFB on the app shell were not measured. Lighthouse in CI covers only four public pages.
- **No live database.** RLS enforcement, RPC behaviour, index effectiveness, and query plans were not verified at runtime. Every database conclusion in this report is inferred from migration source.
- **No real device testing.** Responsive behaviour on small phones, tablets, landscape, keyboard-open states, and safe-area handling was assessed from source only. Touch target sizes were read from Tailwind classes rather than measured in a browser.
- **No screen-reader session.** Accessibility findings are from code inspection and computed contrast, not from VoiceOver or NVDA.
- **No `supabase db reset` execution.** DB-001 is established from static analysis — the five legacy columns appear in no `CREATE TABLE` or `ADD COLUMN` across all 69 migrations, and the reference sits in a top-level `UPDATE` that Postgres validates at parse time. The conclusion is high-confidence but was not confirmed by running the reset against a clean Postgres. That run should be the first step of the DB-001 fix.
- **The 17 canonical KAIOS specifications were not available.** A repository-wide search returns zero matches for "KAIOS." The AI subsystem was assessed on general principles for production AI systems rather than against those specs, so the AI/KAIOS score should be treated as provisional if the specs exist elsewhere.
- **No AI behavioural evaluation.** Coach response quality, persona consistency, and safety across a fixed prompt set were not assessed.
- **No load testing at scale.** The k6 smoke in CI runs 5 VUs for 10 seconds; scalability conclusions are analytical.
- **Git history was not scanned for historical secrets** beyond confirming Gitleaks is correctly configured in CI.

Confidence ratings throughout reflect these boundaries. Where evidence was thin I lowered confidence rather than inferring a result.

**Revision note.** After the initial draft, dedicated deep-dive passes over the database schema, the AI subsystem, and the accessibility/UX surface added 24 issues and corrected two claims: the `SECURITY DEFINER` `search_path` statement now carries its one exception (SEC-011), and `coaching_memory` was incorrectly described as having no retention purge when it is in fact covered at 24 months. The overall score moved from 73 to 71 as a result. The release recommendation did not change.
