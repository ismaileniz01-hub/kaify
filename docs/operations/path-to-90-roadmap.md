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

- [ ] Enable Supabase Auth leaked-password (HIBP) protection — **dashboard** (login required): https://supabase.com/dashboard/project/urnetodzvszmddzdazdj/auth/providers?provider=Email — or `SUPABASE_ACCESS_TOKEN` + `node scripts/ops/enable-hibp.mjs` · evidence: [faz4-security-reliability.md](./evidence/faz4-security-reliability.md)
- [x] Confirm real secrets for cron/hub: strong `CRON_SECRET` + `ADMIN_HUB_SECRET` set on Vercel project **`kaify`** (prod/preview); vault `kaify_cron_secret` aligned; smoke `GET /api/cron/leaderboard-snapshot` → 200
- [x] Confirm remaining secrets are strong: `CSRF_SECRET` + `ADMIN_HUB_PASSWORD` rotated (2026-08-04); Paddle/Upstash still operator-verify
- [x] Set `ADMIN_EMAIL` allowlist — `ismaileniz01@gmail.com` on Vercel `kaify` production+preview; profile already `role=admin`
- [x] Address `pg_net` in `public` schema advisor WARN — **waiver documented** ([faz1-advisor-waivers.md](./faz1-advisor-waivers.md)); extension comment on prod
- [x] RLS-enabled / no-policy tables: service_role-only intent + `REVOKE` (`20260804170000_faz1_service_table_grants.sql`)

### Ops

- [x] Apply vault-backed frequent pg_cron ([pg-cron-frequent-schedules-vault.sql](./pg-cron-frequent-schedules-vault.sql) / `20260804171000_faz1_pg_cron_vault_schedules.sql`) — 15m leaderboard + self-recovery, hourly outbox/notifications, 6h cost-check
- [x] Confirm `cron.job` active (5 jobs; legacy `kaify-notifications` retired)
- [ ] Confirm `cron_job_runs` healthy for 24h — **operator** (wait)
- [ ] Complete [`DEPLOY_CHECKLIST.md`](../DEPLOY_CHECKLIST.md) + [`10k-go-live-checklist.md`](./10k-go-live-checklist.md) with evidence — **operator**
- [ ] Disconnect/ignore Netlify if it still fails PRs — **operator**
- [x] Single Vercel production for custom domain: **`kaify`** has `kaifyai.org`; `kaify-main` is secondary (no custom domain) — documented in waivers
- [x] Fix doc drift: `SECURITY.md` rate-limit posture, required hub secret, LemonSqueezy removed from DEPLOY

**Exit (code/infra):** Authed cron smoke OK · frequent crons listed · docs synced · grants applied.  
**Exit (operator):** HIBP on · `ADMIN_EMAIL` set · 24h cron health · checklists signed.

---

## Faz 2 — Critical path tests

- [x] **Paddle webhook** unit/integration: bad signature → 401; happy path skip; `claim_in_progress` → 503 retryable (`tests/integration/paddle-webhook.flow.test.ts`, `tests/unit/paddle-signature.test.ts`)
- [x] **OTP send/verify** unit/integration: schemas, GoTrue error map, send/verify routes (`tests/integration/otp.flow.test.ts`, `tests/unit/send-otp-server.test.ts`)
- [x] **Auth Playwright E2E** (TD-002): `e2e/auth-otp.spec.ts` — login always; OTP→session staging-gated via `E2E_AUTH_ENABLED` + `E2E_OTP_*`
- [x] Billing portal session create (mocked Paddle) (`tests/integration/billing-portal.flow.test.ts`)
- [x] **RPC grant regression** test in CI (`tests/security/rpc-privilege-matrix.test.ts` + Faz 0 lockdown tests)

**Exit:** New tests green in CI · webhook/OTP not skipped · staging E2E secret-gated.  
**Shipped:** 2026-08-04.

---

## Faz 3 — Reliability + performance

### Performance

- [x] Fix `auth_rls_initplan` WARN: `(select auth.uid())` on flagged policies (`20260804180000_faz3_rls_initplan_fk_indexes.sql` — applied prod; advisors clear)
- [x] Index missing FKs (`analytics_pending_confirmations.message_id`, `domain_events.user_id`, `pending_gifts.granted_by`)
- [x] Reduce `/welcome` first-load JS — dynamic import ProfileModal / NotificationCenter / PendingGiftCard / WelcomeExtras; quote catalog off client
- [x] Leaderboard: shared `components/FlagImage.tsx` + `flagcdn.com` in `next.config.ts`
- [x] k6 / health evidence archived ([evidence/k6-health-probe-2026-08-04.md](./evidence/k6-health-probe-2026-08-04.md)); **20 VU hotpaths** still need local `k6` + `K6_ACCESS_TOKEN`

### Reliability (TD-007)

- [ ] Uptime monitor on `/api/health` — **operator** ([evidence/td007-monitors-checklist.md](./evidence/td007-monitors-checklist.md))
- [ ] Sentry alerts: error spike, cron failure — **operator** (same checklist)
- [x] Backup verification cron evidence ([evidence/backup-verification-2026-08-04.md](./evidence/backup-verification-2026-08-04.md) — 7× daily `ok`)
- [x] Incident severity + runbook linked (`docs/RUNBOOK.md` §8 → `docs/reliability/incident-response.md`)

**Exit (code/DB):** Hot-table `auth_rls_initplan` + FK advisor items cleared · welcome/leaderboard perf shipped · backup + oncall docs.  
**Exit (operator):** Uptime + Sentry rules live · optional k6 20 VU archive.

**Shipped:** 2026-08-04.

---

## Faz 4 — UX + code quality (web 90 checkpoint)

### UI / UX

- [x] `loading.tsx` for chat, trophy-road (market), streak, leaderboard, settings, pricing
- [x] `app/not-found.tsx` (i18n)
- [x] Broaden `EmptyState` (chat / market / leaderboard)
- [x] Fix ImagePicker `alt` / a11y lint blockers
- [x] Onboarding: wired via `OnboardingGate` + `SignupWizard` → `POST /api/onboarding` (no dead endpoint)

### Code quality

- [x] Clear lint unused/`any` hotspots (`ChatBubbles`, etc.)
- [x] Start TD-003: coverage extracts (`count-consecutive-rest-days`, `resolve-api-path`)
- [x] Start TD-004: client hot paths → `/api/v1/*` via `resolveApiPath`
- [x] Address v1 re-export `runtime`/`dynamic` build warnings (local consts on v1 routes)
- [x] Optional: `lint:strict` CI gate

**Exit:** Re-run full release gate → web score **≥ 90** (store still Faz 5).

---

## Faz 5 — Store readiness (mobile 90)

### Billing policy (must choose one)

- [x] **B)** Gate Paddle Checkout to web-only; native → “Manage on kaifyai.org” — [ADR 019](../sustainability/adr/019-store-billing-policy.md)
- [ ] ~~A) Native IAP~~ deferred
- [ ] ~~C) External purchase links~~ legal track only

### iOS

- [x] `PrivacyInfo.xcprivacy`
- [x] `NSCameraUsageDescription` / photo library strings (vision + avatar)
- [x] App Store URL via `NEXT_PUBLIC_APP_STORE_URL` / `store-links.ts` (listing live URL when published)
- [x] HealthKit strings **N/A** (feature not shipped)

### Android

- [x] Align `applicationId` with listing (`org.kaifyai.app`)
- [x] `google-services.json` in release pipeline (example + `verify-google-services.mjs`)
- [x] Notification permission UX (`PushToggle` native copy + consent)

### Both

- [x] `npm run cap:sync:prod` script (+ entry path `/login`) — verified 2026-08-04
- [x] Store screenshots checklist; privacy/terms deep links + `.well-known` templates
- [x] Permissions-Policy `camera=()` reconciled with OS capture pickers (documented)

**Exit:** Store billing ADR signed · package IDs match · privacy manifest present · TestFlight / internal track installs = **operator** (see evidence checklist).

---

## Faz 6 — Enterprise 92+

- [x] **TD-006** Eng evidence pack shipped ([evidence/td006-compliance-evidence-pack.md](./evidence/td006-compliance-evidence-pack.md)) — **counsel L1/L2/L4 still required** for auditor claim
- [x] **TD-008** ZAP staging waived with dated waiver ([evidence/td008-zap-waiver.md](./evidence/td008-zap-waiver.md)); workflow uses `vars.STAGING_URL` + status job; SBOM/OSV weekly
- [x] **TD-007** Eng checklist + paste fields ([evidence/td007-monitors-checklist.md](./evidence/td007-monitors-checklist.md)) — **operator** still pastes monitor URLs/IDs
- [x] **TD-001** Accepted via Sentry spans ([ADR 017](../sustainability/adr/017-otel-migration-plan.md))
- [x] **TD-003** Coverage expanded (`gem.service`, `rpc-errors`, `lib/compliance/*`, `to-span-attributes`) — full `lib/services/**` still Q4

**Exit (eng):** Debt register updated · evidence packs on disk · coverage gate broader · ZAP waiver or green staging.  
**Exit (operator/legal):** Uptime + Sentry IDs · counsel sign-off · optional `STAGING_URL` to lift ZAP waiver.

**Shipped (eng):** 2026-08-04.

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
