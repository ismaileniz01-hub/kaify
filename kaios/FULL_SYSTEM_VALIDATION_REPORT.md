# KAIOS Full System Production Validation & Adversarial Audit

**Date:** 2026-08-10 (live staging validation pass)  
**Branch:** `cursor/kaios-migration-ecdb`  
**PR:** https://github.com/ismaileniz01-hub/kaify/pull/20  
**Scope:** Prove real production behavior on staging. No architecture redesign. Legacy soak rollback retained.

---

## Evidence classification legend

| Label | Meaning |
| --- | --- |
| **LIVE TESTED** | Real provider/DB/browser executed with legitimate credentials |
| **MOCK TESTED** | Unit/integration with mocks/fakes |
| **STATICALLY VERIFIED** | Code/prompt/schema inspection or deterministic unit tests |
| **NOT TESTED** | Blocked or not executed; no fabricated results |

---

## 1. Executive summary

Architecture and static/mock validation remain strong (**145** KAIOS-focused tests; intent paraphrase corpus expanded). This pass **attempted** live DeepSeek / Gemini / Supabase / Playwright validation against staging.

**Blocker:** This Cursor Cloud run has **no linked environment** and **no provider/database credentials** (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, Supabase URL/keys, dual-user JWTs, staging URL all unset). Probe artifact: `kaios/live-evidence/environment-probe.json` + `STATUS.json` (`BLOCKED`).

**What changed this pass (offline-capable):**
- Expanded intent paraphrase regressions beyond FS-001
- Recorded then fixed additional routing defects (FS-006–FS-011)
- Added gated live harnesses under `tests/kaios/live/` + `npm run test:kaios:live`
- Added Playwright `e2e/kaios-flows.spec.ts` (staging/auth gated)
- Kept soak rollback (`KAIOS_RUNTIME=false` only); no automatic KAIOS→legacy fallback

Live provider token/latency tables remain empty by policy (not fabricated).

---

## 2. Environment tested

| Item | Value |
| --- | --- |
| Runtime | Cursor Cloud agent VM (`/workspace`) |
| Linked Cursor environment | **none** (JIT) |
| Node / Next | as repo `package.json` |
| Supabase | **NOT TESTED** — unset |
| DeepSeek | **NOT TESTED** — unset |
| Gemini | **NOT TESTED** — unset |
| Dual synthetic users | **NOT TESTED** — unset |
| Staging URL / Playwright auth | **NOT TESTED** — unset |
| Egress | unrestricted |
| Live probe | `node scripts/kaios-live-validation.mjs` → `BLOCKED` |

### How to complete LIVE on staging

```bash
# Required secrets in Cursor environment / .env.local (never commit):
DEEPSEEK_API_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
KAIOS_LIVE_USER_A_ID=...
KAIOS_LIVE_USER_B_ID=...
KAIOS_LIVE_USER_A_JWT=...
KAIOS_LIVE_USER_B_JWT=...
KAIOS_LIVE_COUNCIL_USER_ID=...   # entitled Team Chat account
STAGING_URL=https://...
E2E_AUTH_ENABLED=1
E2E_OTP_EMAIL=...
E2E_OTP_CODE=...

KAIOS_LIVE=1 npm run test:kaios:live:run
```

---

## 3. LIVE TESTED

_None in this environment._ Credentials absent; no fabricated DeepSeek/Gemini/Supabase/browser results.

Harnesses ready to execute when secrets are present:
| Suite | Path |
| --- | --- |
| DeepSeek conversational | `tests/kaios/live/deepseek-conversational.live.test.ts` |
| Gemini vision | `tests/kaios/live/gemini-vision.live.test.ts` |
| Supabase multi-user RLS | `tests/kaios/live/supabase-rls.live.test.ts` |
| Maya + Council E2E | `tests/kaios/live/maya-council.live.test.ts` |
| Playwright KAIOS flows | `e2e/kaios-flows.spec.ts` |
| Probe runner | `scripts/kaios-live-validation.mjs` |

---

## 4. MOCK TESTED

- Tool authorization / pending confirm ownership (`tests/kaios/tool-authorization.test.ts`)
- Hydration write failure → `ok:false`
- Analytics confirm wrong-owner / missing / duplicate
- Event best-effort emission after canonical write
- Chaos/failure helpers (`tests/kaios/chaos-failures.test.ts`)
- Structured-card hard-stop under KAIOS
- Live suites skip-cleanly when credentials missing (no false green live claims)

---

## 5. STATICALLY VERIFIED

- Capsules, compiler order (safety→core), precedence
- No full-spec markdown in runtime prompts
- Intent routing + output ceilings (**expanded paraphrase corpus**)
- Memory poison sanitize + ≤5 select
- Localization resolve / short-expression / Turkish casing helpers
- Nutrition `model_estimate` provenance + no invented catalog
- Vision observation prompts (no “You are Maya/Leo”)
- Exercise catalog ID validation
- Leo fingerprint same-image helper
- Council envelope `await_user` / coaches-only speakers
- Soak flag default on; no KAIOS→legacy catch-fallback
- Legacy symbols soak-only when KAIOS on
- Prompt audit matrix (`kaios/audit/runtime-prompt-audit.json`)
- Token baseline files (static char/4 estimates) — **not** live provider metrics

---

## 6. NOT TESTED (live evidence gaps)

| Area | Status |
| --- | --- |
| DeepSeek multi-sample coach/intent quality | NOT TESTED |
| Schema adherence / malformed rate under live model | NOT TESTED |
| Provider input/output/total tokens + cache | NOT TESTED |
| p50/p95 latency by coach/intent | NOT TESTED |
| Gemini Maya food fixtures (real photos) | NOT TESTED |
| Gemini Leo valid/invalid/blur/crop/repeat | NOT TESTED |
| Real Supabase dual-user RLS/RPC matrix | NOT TESTED |
| Maya photo→confirm→RPC→analytics→events | NOT TESTED |
| Council full interactive session (entitled) | NOT TESTED |
| Playwright streaming / confirm / await_user | NOT TESTED |
| Live vs `kaios/baseline/*` comparison | NOT TESTED |

---

## 7. Exact commands executed

```text
npx vitest run tests/kaios/intent.test.ts tests/kaios/live
npx vitest run tests/kaios                 # 23 files, 145 passed
node scripts/kaios-live-validation.mjs     # BLOCKED — no credentials
# Live suites intentionally not forced: would skip all provider cases
```

---

## 8. Test counts / results

| Suite | Result |
| --- | --- |
| `tests/kaios` (incl. live skip harness) | **145 passed** / 23 files |
| Intent paraphrase corpus | expanded (`it.each` natural phrasing) |
| Live provider execution | **0** (blocked) |
| Playwright KAIOS flows | authored; **not executed** against staging |

---

## 9. Build / type / lint results

Prior branch CI was green (Lint·Typecheck·Test, supply-chain, Lighthouse, Playwright smoke). This pass focused on live harness + intent regressions; re-check CI after push.

---

## 10. Frontend E2E results

| Spec | Status |
| --- | --- |
| `e2e/smoke.spec.ts` | STATIC/CI historically green |
| `e2e/auth-otp.spec.ts` | staging-gated |
| `e2e/kaios-flows.spec.ts` | **NEW** — coach stream, structured render, Maya shell, Leo invalid, Council await/resume, refresh, error state; **NOT TESTED** live (no auth staging) |

---

## 11. DeepSeek live results

**NOT TESTED** — `DEEPSEEK_API_KEY` unset.

Target matrix (harness): Kai casual/motivation/health-safety; Alex form/programming/progression; Maya nutrition/structured; Leo synthesis; Council turns — multi-sample, identity, schema, ceiling, single model call, tokens, cache, latency, malformed rate.

---

## 12. Gemini live results

**NOT TESTED** — `GEMINI_API_KEY` unset.

Target matrix (harness): Maya food variants + Leo quality/repeat; observation-only; no coach persona; no fabricated analysis on failure.

---

## 13. Coach behavior results

| Coach | Method | Finding |
| --- | --- | --- |
| Alex | STATIC + paraphrase corpus | FS-001 retained; FS-006/007/008/009 fixed + regressions |
| Maya | STATIC/MOCK + paraphrases | FS-010/011 fixed; live photo path NOT TESTED |
| Leo | STATIC | Live score stability NOT TESTED |
| Kai | STATIC + paraphrases | Motivation paraphrases expanded; live voice NOT TESTED |
| Council | STATIC | Live entitled session NOT TESTED |

---

## 14–29. Prior static/mock findings (unchanged summary)

Authorization **MOCK**; Maya confirm **MOCK**; Leo fingerprint **STATIC**; Council `await_user` **STATIC**; event durability invariant **STATIC/MOCK**; SSE single-call design **STATIC**; legacy soak-only **STATIC**; baselines remain static estimates in `kaios/baseline/{pre,post}-migration.json` — **live comparison NOT TESTED**.

Soak rollback: **retained**. `KAIOS` default on. No automatic fallback. Rollback via `KAIOS_RUNTIME=false` remains observable (`kaios.runtime.rollback_active`).

---

## 30. Test-quality updates this pass

- Intent regressions now use diverse natural paraphrases (not only keywords)
- Live harnesses skip instead of fabricating green live results
- Playwright KAIOS flows added (gated)
- Remaining gap: execution against real staging credentials

---

## 31. P0 issues

_None confirmed in testable surface._

---

## 32. P1 issues

### FS-LIVE-001 — Staging credentials unavailable in validation environment
- **Severity:** P1 (release-evidence blocker)
- **Reproduction:** Run `node scripts/kaios-live-validation.mjs` on this Cloud agent
- **Expected:** DeepSeek/Gemini/Supabase dual-user/staging secrets available for canary proof
- **Actual:** All live flags `false`; `STATUS.json` = `BLOCKED`
- **Root cause:** No linked Cursor environment / secrets for this run
- **Affected files:** N/A (environment)
- **Fix recommendation:** Attach staging secrets to Cursor environment; re-run `KAIOS_LIVE=1 npm run test:kaios:live:run`
- **Regression test:** `scripts/kaios-live-validation.mjs` probe + live suites

---

## 33. P2 issues

### FS-001 — Alex form question misrouted to `programming` (prior)
- Fixed earlier; regression retained.

### FS-006 — Plural lift / “knees cave on squats” → `unknown`
- **Severity:** P2  
- **Reproduction:** `resolveIntent({ coach:"alex", message:"My knees cave in on squats — what should I fix?" })`  
- **Expected:** `exercise_form`  
- **Actual (before):** `unknown`  
- **Root cause:** Alex lift fallback used singular `\bsquat\b` only; FORM_RE missed knees-cave phrasing  
- **Affected files:** `lib/kaios/routing/intent.ts`, `tests/kaios/intent.test.ts`  
- **Fix recommendation:** Applied — plurals + knees-cave cue  
- **Regression test:** paraphrase corpus  

### FS-007 — “push pull legs schedule” → `tool_action`
- **Severity:** P2  
- **Reproduction:** `… message:"I need a push pull legs schedule"`  
- **Expected:** `programming`  
- **Actual (before):** `tool_action` (bare `schedule` in TOOL_RE)  
- **Root cause:** Over-broad tool keyword  
- **Affected files:** `lib/kaios/routing/intent.ts`  
- **Fix recommendation:** Applied — TOOL_RE requires `schedule (workout|session|…)`  
- **Regression test:** paraphrase corpus  

### FS-008 — “sets and reps” / “progress … weeks” misroutes
- **Severity:** P2  
- **Reproduction:** `"Give me sets and reps for incline press"`; `"How should I progress my bench over 8 weeks?"`  
- **Expected:** `programming`  
- **Actual (before):** `casual` / `exercise_form`  
- **Root cause:** `rep` without plural boundary; `progression` only (not `progress`); `?`+bench preferred form  
- **Affected files:** `lib/kaios/routing/intent.ts`  
- **Fix recommendation:** Applied — `sets?…reps?`, `progress(?:ion|ing)?`, build-me-workout PROGRAM cues  
- **Regression test:** paraphrase corpus  

### FS-009 — Motivation paraphrases missed (`quit training`, `push me`)
- **Severity:** P2  
- **Reproduction:** `"I want to quit training forever"`; `"Can you push me a bit today?"`  
- **Expected:** `motivation`  
- **Actual (before):** `casual`  
- **Root cause:** MOTIVATION_RE gaps  
- **Affected files:** `lib/kaios/routing/intent.ts`  
- **Fix recommendation:** Applied  
- **Regression test:** paraphrase corpus  

### FS-010 — “calories” plural / meal-without-image / dinner plan
- **Severity:** P2  
- **Reproduction:** `"… how many calories roughly?"`; `"Describe this meal"`; `"Plan my dinners for the week"`  
- **Expected:** `nutrition_question` / `nutrition_question` / `meal_plan`  
- **Actual (before):** `unknown` / `casual` / `casual`  
- **Root cause:** `calorie` word-boundary vs `calories`; weak meal/plan paraphrases  
- **Affected files:** `lib/kaios/routing/intent.ts`  
- **Fix recommendation:** Applied  
- **Regression test:** paraphrase corpus  

### FS-011 — Alex “tired + build workout” preferred motivation over programming
- **Severity:** P2  
- **Reproduction:** `"I am tired, build me an easy workout"`  
- **Expected:** `programming`  
- **Actual (before):** `motivation`  
- **Root cause:** tired matched before program phrasing existed  
- **Affected files:** `lib/kaios/routing/intent.ts`  
- **Fix recommendation:** Applied — PROGRAM build/create/need+workout patterns  
- **Regression test:** paraphrase corpus  

### FS-002 — Durable event outbox absent (prior P2)
### FS-003 — No trusted nutrition catalog (prior P2)
### FS-004 — Soak legacy path retained (intentional)
### FS-005 — Live token/latency evidence missing (**still open** — FS-LIVE-001)

---

## 34. P3 issues

- Leo radial / Council premium UI deferred  
- Capsule densification iteration  
- Controlled food/physique image fixtures for Gemini harness (currently tiny PNG placeholders)  

---

## 35. Recommended next actions

1. Attach staging secrets to Cursor environment (or local `.env.local`)  
2. `KAIOS_LIVE=1 npm run test:kaios:live:run` and commit/update `kaios/live-evidence/*.json`  
3. Compare live token/latency to `kaios/baseline/pre-migration.json` & `post-migration.json`  
4. Only after satisfactory live canary evidence: consider soak rollback removal  

---

## Release decisions

```text
CANARY_RELEASE_DECISION:
GO_WITH_FIXES

BROAD_PRODUCTION_DECISION:
NO_GO

LEGACY_REMOVAL_READY:
NO

TOP_REMAINING_FIXES:
1. Execute live DeepSeek + Gemini synthetic evals on staging; publish token/latency evidence (FS-LIVE-001 / FS-005)
2. Execute real Supabase dual-user RLS + Maya confirm + Council entitled E2E; attach Playwright auth staging run
3. After soak with live canary evidence: remove legacy runtime path (keep until then; rollback must stay observable)
```

**Rationale:** Offline static/mock + intent fixes support a careful canary **with soak rollback**, but broad production and legacy removal require measured live staging proof that this environment could not obtain.
