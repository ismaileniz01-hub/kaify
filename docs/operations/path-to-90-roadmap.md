# Path to 90 — Production Readiness Roadmap

**Baseline:** Final release gate 2026-08-04 → score **41 / 100**, status **NO GO**  
**Target:** Web readiness **≥ 90** (Security PASS · LOW/MEDIUM, Tests PASS). Store **≥ 90** is **Faz 5** (separate gate).  
**Rule:** Do not claim 90 until each phase **exit criterion** is evidenced.

Score lift (indicative):

| Faz | Focus | Est. | Score after |
|-----|--------|------|-------------|
| 0 | Emergency RPC lockdown | 0.5 d | 41 → 55 |
| 1 | Security + ops (cron/env/docs) | 2–3 d | → 68 |
| 2 | Critical tests (OTP, webhook, auth E2E) | 3–4 d | → 78 |
| 3 | Reliability + performance | 2–3 d | → 84 |
| 4 | UX + code quality (web 90 checkpoint) | 2–3 d | → 88–90 |
| 5 | App Store / Play Store | 3–5 d | store ≥ 90 |
| 6 | Enterprise 92+ (legal / ZAP / alerts) | ongoing | → 92+ |

---

## Faz 0 — Emergency lockdown (P0)

**Goal:** Stop public economy mint via PostgREST.

- [x] Migration: `REVOKE EXECUTE` on `admin_create_pending_gift`, `grant_freezie`, `apply_daily_chest_reward`, `record_cron_run` (and siblings) from `anon`, `authenticated`, `PUBLIC`; `GRANT` to `service_role` only
- [x] Defense in depth: `require_service_role()` / JWT guards inside SECURITY DEFINER bodies (`grant_freezie` excluded for nested `claim_pending_gift`)
- [x] Privilege audit regression test: `tests/security/faz0-rpc-lockdown.test.ts`
- [x] Verify: live `anon_exec=false` on economy/admin DEFINER RPCs; leaderboards remain public
- [x] Full sweep of gem/ledger/spend/chest/admin DEFINER RPCs + `ALTER DEFAULT PRIVILEGES`

**Exit:** Live `has_function_privilege('anon', …) = false` for all economy/admin DEFINER RPCs · app smoke OK.  
**Shipped:** `supabase/migrations/20260804160000_faz0_rpc_privilege_lockdown.sql` (applied to prod 2026-08-04).

---

## Faz 1 — Security + ops foundation

### Security

- [ ] Enable Supabase Auth leaked-password (HIBP) protection
- [ ] Set `ADMIN_EMAIL` allowlist in Vercel production
- [ ] Confirm real secrets (not placeholders): `CRON_SECRET`, `CSRF_SECRET`, `ADMIN_HUB_*`, `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, Upstash — redeploy
- [ ] Address `pg_net` in `public` schema advisor WARN (move or document waiver)
- [ ] RLS-enabled / no-policy tables: confirm service_role-only intent or add policies

### Ops

- [ ] Apply [`pg-cron-frequent-schedules.sql`](./pg-cron-frequent-schedules.sql) (15m leaderboard, hourly outbox/notifications, 15m self-recovery, 6h cost-check)
- [ ] Confirm `cron.job` active; `cron_job_runs` healthy for 24h
- [ ] Complete [`DEPLOY_CHECKLIST.md`](../DEPLOY_CHECKLIST.md) + [`10k-go-live-checklist.md`](./10k-go-live-checklist.md) with evidence
- [ ] Disconnect/ignore Netlify if it still fails PRs
- [ ] Single Vercel production project (`kaify` vs `kaify-main`) — avoid dual prod
- [ ] Fix doc drift: `SECURITY.md` rate-limit posture, hub secret fallback, remove LemonSqueezy from DEPLOY

**Exit:** Authed detailed `/api/health` OK · frequent crons listed · checklists signed · HIBP on · `ADMIN_EMAIL` set.

---

## Faz 2 — Critical path tests

- [ ] **Paddle webhook** unit/integration: bad signature → 401; happy path entitlement; `claim_in_progress` → retryable
- [ ] **OTP send/verify** unit/integration: validation, rate limit, GoTrue error mapping, session path
- [ ] **Auth Playwright E2E** (TD-002): OTP → session → check-in on staging
- [ ] Billing portal session create (mocked Paddle acceptable)
- [ ] **RPC grant regression** test in CI (migration text or privilege snapshot)

**Exit:** New tests green in CI · webhook/OTP not skipped · staging E2E evidenced or secret-gated.

---

## Faz 3 — Reliability + performance

### Performance

- [ ] Fix `auth_rls_initplan` WARN: `(select auth.uid())` on flagged policies
- [ ] Index missing FKs (`analytics_pending_confirmations`, `domain_events`, `pending_gifts`)
- [ ] Reduce `/welcome` first-load JS (dynamic import / quote payload)
- [ ] Leaderboard: prefer `next/image` over raw `<img>` where safe
- [ ] Archive k6 hotpaths staging run (20 VU soft SLO)

### Reliability (TD-007)

- [ ] Uptime monitor on `/api/health`
- [ ] Sentry alerts: error spike, cron failure
- [ ] Backup verification cron evidence
- [ ] Incident severity + runbook linked for oncall

**Exit:** Hot-table performance advisor WARNs cleared or waived · k6 report attached · TD-007 evidence.

---

## Faz 4 — UX + code quality (web 90 checkpoint)

### UI / UX

- [ ] `loading.tsx` for chat, market, streak, leaderboard, settings, pricing
- [ ] `app/not-found.tsx` (i18n)
- [ ] Broaden `EmptyState` (chat / market / leaderboard)
- [ ] Fix ImagePicker `alt` / a11y lint blockers
- [ ] Onboarding: wire form or ship explicit deferred UX (no dead endpoint expectation)

### Code quality

- [ ] Clear lint unused/`any` hotspots (`ChatBubbles`, etc.)
- [ ] Start TD-003: coverage extracts from billing/chat pure paths
- [ ] Start TD-004: client hot paths → `/api/v1/*`
- [ ] Address v1 re-export `runtime`/`dynamic` build warnings if feasible
- [ ] Optional: `lint:strict` CI gate

**Exit:** Re-run full release gate → web score **≥ 90** (store still Faz 5).

---

## Faz 5 — Store readiness (mobile 90)

### Billing policy (must choose one)

- [ ] **A)** Native IAP (StoreKit / Play Billing) for digital subscriptions, **or**
- [ ] **B)** Gate Paddle Checkout to web-only; native → “Manage on kaifyai.org”, **or**
- [ ] **C)** External purchase links per current Apple/Google rules (legal review)

### iOS

- [ ] `PrivacyInfo.xcprivacy`
- [ ] `NSCameraUsageDescription` / photo library strings (vision + avatar)
- [ ] Real App Store URL; HealthKit strings if steps feature ships

### Android

- [ ] Align `applicationId` with listing (`org.kaify.app` vs marketing `org.kaifyai.app`)
- [ ] `google-services.json` in release pipeline
- [ ] Notification permission UX

### Both

- [ ] `npm run cap:sync:prod`
- [ ] Store screenshots; privacy/terms deep links
- [ ] Permissions-Policy `camera` vs capture UX reconciled

**Exit:** Store billing ADR signed · package IDs match · privacy manifest present · TestFlight / internal track installs + signs in.

---

## Faz 6 — Enterprise 92+

- [ ] **TD-006** Legal compliance Faz 4 sign-off + retention/export/deletion evidence pack
- [ ] **TD-008** `STAGING_URL` + weekly ZAP baseline green or waived
- [ ] **TD-007** complete if not finished in Faz 3
- [ ] **TD-001** OTel optional (Sentry spans acceptable)
- [ ] Continue **TD-003** full service coverage

---

## Master checklist (22 items)

| # | Workstream | Faz |
|---|------------|-----|
| 1 | Anon RPC revoke + body guards | 0 |
| 2 | Sibling DEFINER grant sweep | 0 |
| 3 | HIBP password protection | 1 |
| 4 | `ADMIN_EMAIL` + secrets verify | 1 |
| 5 | Frequent pg_cron schedules | 1 |
| 6 | DEPLOY + 10k checklist signed | 1 |
| 7 | Single Vercel prod + Netlify quiet | 1 |
| 8 | Doc drift fix | 1 |
| 9 | Paddle webhook tests | 2 |
| 10 | OTP tests | 2 |
| 11 | Auth Playwright E2E | 2 |
| 12 | RPC grant regression test | 2 |
| 13 | RLS initplan + FK indexes | 3 |
| 14 | Welcome / image perf | 3 |
| 15 | k6 + uptime + Sentry alerts | 3 |
| 16 | loading / not-found / EmptyState | 4 |
| 17 | Lint + coverage extracts | 4 |
| 18 | Store billing policy ADR | 5 |
| 19 | Privacy Manifest + perm strings | 5 |
| 20 | Play package ID + FCM | 5 |
| 21 | Legal sign-off (TD-006) | 6 |
| 22 | ZAP staging (TD-008) | 6 |

---

## Suggested calendar (1 engineer)

| When | What |
|------|------|
| Day 0 | **Faz 0** hotfix to prod |
| Days 1–3 | Faz 1 |
| Days 4–7 | Faz 2 |
| Week 2 | Faz 3 + 4 → re-audit web ≥ 90 |
| Week 3+ | Faz 5 store |
| Parallel | Faz 6 |

**Do not skip Faz 0.** Shipping later phases while anon RPC grants remain open keeps overall score below 60.
