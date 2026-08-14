# Wave 6 — UX, accessibility, i18n, SEO

**Date:** 2026-08-14  
**Branch:** `cursor/signup-onboarding-lifestyle-fields`  
**Stop condition:** Wave 6 only. Waves 7 (KAIOS) and 8 (final re-audit) were not started. Waves 1–5 were not reopened except where this wave found remaining product gaps.

## EXECUTIVE_RESULT

Wave 6 is closed as **COMPLETE_WITH_EXTERNAL_BLOCKER**. Technical SEO on current HEAD is launch-grade under **Strategy B** (one canonical English crawl language; client/cookie product localization; no invented locale-prefixed routes). Authenticated Playwright/axe still cannot run without owner-provisioned synthetic OTP credentials.

**Closure-pass facts (this HEAD):**
- `/pricing` is a static marketing route (`○`, revalidate 1h) so title/description/canonical/OG sit in the **first** `<head>` (Lighthouse `meta-description` no longer 0).
- Guest middleware no longer intercepts `/opengraph-image` (PNG `200`, `image/png`).
- Pricing checkout no longer throws `useSession` outside `SessionProvider` (guest `useSessionOptional`).
- Runtime Playwright covers indexable metadata, OG image, private sitemap absence, public link crawl, public named-control a11y, Arabic `dir=rtl`.
- Lighthouse SEO (current commit, `http://127.0.0.1:3005`, mobile, `--headless=new`): **1.00** on `/`, `/pricing`, `/privacy`, `/terms`, `/cookies`, `/kvkk`.

No Wave 7 work was started.

---

## PHASE 0 — USER-FACING BASELINE (CURRENT HEAD, re-measured)

**UX_SCORE_BEFORE:** 66/100  
**ACCESSIBILITY_SCORE_BEFORE:** 58/100  
**SEO_SCORE_BEFORE:** 55/100  
**FRONTEND_SCORE_BEFORE:** 72/100

Pre-wave HEAD facts: no `app/robots.ts` / `app/sitemap.ts`; root metadata was title+description only; `lighthouserc.cjs` did not collect SEO; language is cookie/client-only; `public/index.html` Capacitor fallback competed at the web root; SSE used hardcoded Turkish; first-chat checklist could complete on navigation; `chatDone` was hardcoded `false` in home core.

---

## ROUTE_INDEXABILITY_MATRIX

| Route | Class | Index | Title / description | Canonical | robots | lang | H1 / main | Loading / empty / error | Auth | Keyboard / mobile |
|-------|--------|-------|---------------------|-----------|--------|------|-----------|-------------------------|------|-------------------|
| `/` | PUBLIC / INDEXABLE | INDEX | Unique marketing title + description | `https://kaifyai.org` | index,follow | HTML `en` (client may set `lang`/`dir`) | `main` + H1 in hero; `#main-content` | Static SSR copy | Public | Skip link, links |
| `/pricing` | PUBLIC / INDEXABLE | INDEX | Pricing title + description | `https://kaifyai.org/pricing` | index,follow (page overrides app noindex) | same | `main` + H1 | Static | Public | CTA links |
| `/privacy` `/terms` `/cookies` `/kvkk` | LEGAL / INDEXABLE | INDEX | Legal titles | absolute path canonicals | index,follow | same | `main` + H1 | Static legal copy | Public | Header links |
| `/terms&conditions` | redirect | — | — | 301 → `/terms` | — | — | — | — | — | — |
| `/login` `/login/mfa` `/signup` | AUTHENTICATION | NOINDEX | Sign-in copy | canonical + noindex | noindex,nofollow | client locale | H1 on login | Auth forms | Guest OK | OTP digits (A11Y-007) |
| `/welcome` `/chat*` `/analytics` `/settings*` `/leaderboard` `/messages` `/streak` `/trophy-road` `/library*` `/myaccount` `/admin*` | AUTHENTICATED PRODUCT | NOT_PUBLIC | App chrome; layout noindex | not in sitemap | noindex + robots disallow | client | AppHeader `h1` + `#main-content` | Per-page states | Guest → `/login?next=` | Bottom nav 44px class |
| `/api/*` | SYSTEM | NOT_PUBLIC | — | — | disallow `/api/` | — | — | JSON | Auth on handlers | — |
| `/index.html` | SYSTEM | redirect `/` | — | 301 | — | — | — | Native fallback is `native/offline-index.html` | — | — |

Referral `?ref=` / UTM: metadata canonical is path-only; welcome is not indexable. No per-code landing duplicates in the sitemap.

---

## SEO_METADATA_MATRIX

| Page | title | description | OG | Twitter | image | JSON-LD |
|------|-------|-------------|----|---------|-------|---------|
| `/` | K.AIFY — Your Personal Coach Team | Four expert coaches… $14.99/month | yes | summary_large_image | `/opengraph-image` 1200×630 | Organization, WebSite, SoftwareApplication + Offer 14.99 USD (no ratings) |
| `/pricing` | Pricing — K.AIFY | Choose Essential, Pro, or Premium… | yes | yes | same | inherit page metadata |
| Legal | unique per document | meaningful | yes | yes | same | none extra |
| `/login` | Sign in — K.AIFY | noindex | yes | yes | same | none |

`metadataBase` = `https://kaifyai.org` (`seoCanonicalOrigin()` rejects vercel.app / localhost).

---

## CANONICAL_HREFLANG_MATRIX

| URL | Canonical | hreflang | Notes |
|-----|-----------|----------|-------|
| Indexable paths | `https://kaifyai.org{path}` no trailing slash except origin | **none** | Strategy B |
| `/?utm_*` `/?ref=` | still `/` via metadata path | none | tracking must not duplicate index |
| Locale cookie `tr`/`ar`/… | same public URL | **not emitted** | product i18n only |
| Future locale prefixes | not implemented | documented enhancement | would be Strategy A |

`SEO_PUBLIC_HTML_LANG` + `SEO_HREFLANG_STRATEGY` live in `lib/i18n/reviewed-locales.ts` next to the picker list (same source of truth file).

---

## LOCALE_QUALITY_MATRIX

| Locale | Picker | SEO_INDEXABLE | Quality gate | Notes |
|--------|--------|---------------|--------------|-------|
| en | yes | **yes (public HTML)** | n/a | Canonical crawl language |
| tr | yes | no | ≥ 0.58 vs EN | Real TR for new Wave 6 keys |
| de, fr, es, es-mx, es-ar, it, ar | yes | no | ≥ 0.58 | Reviewed set unchanged (UX-001) |
| pt, nl, pl, ru, ko, zh-CN, ja | dictionaries only | no | not in picker | Wave 1 tradeoff preserved |

Gate raised 0.55 → **0.58**. New keys synced via `i18n:sync` (English fallback for non-reviewed locales). No bulk machine translation of the full corpus.

---

## UX_STATE_MATRIX

| Surface | INITIAL | LOADING | SUCCESS | EMPTY | ERROR | RETRY |
|---------|---------|---------|---------|-------|-------|-------|
| Home / welcome | chrome skeleton while session loading | `a11y.loading_page` | real home DTO | checklist hidden when 3/3 | session error existing | — |
| Chat | session skeleton | `chat.loading` | live / guest demo bubbles | empty thread | failed message + retry (UX-005) | idempotent retry |
| Analytics | — | — | confirm only after POST | — | `analytics.confirm.failed` | retry pending action |
| Leaderboard | — | spinner copy | rows | empty copy | `leaderboard.load_error` | reload |
| Photo | — | sending | only after `/analyze` | — | localized code | photo retry |
| Logout | — | — | confirm dialog | — | — | Escape/cancel |

---

## ACCESSIBILITY_ROUTE_MATRIX

| Route | main | H1 | axe (public) | keyboard | notes |
|-------|------|----|--------------|----------|-------|
| `/` `/pricing` `/privacy` `/login` | yes | yes | Lighthouse a11y ≥ 0.85 CI; Playwright landmark tests | skip link | Public |
| Authenticated product | `#main-content` | AppHeader h1 | **BLOCKED** without OTP secrets | not CI-proven | TEST-003 |
| Chat | log + live | header h1 | source A11Y-001 | retry control | Wave 1 + recheck |
| Settings | main | h1 | toggle names | dialog logout | RTL thumb uses start/translate |

**Screen-reader evidence limitation:** No VoiceOver/NVDA session was executed in this wave.

---

## AUTHENTICATED_E2E_MATRIX

| Suite | Default CI | Staging `E2E_AUTH_ENABLED` |
|-------|------------|----------------------------|
| `e2e/auth-otp.spec.ts` | login surface only | OTP → welcome |
| `e2e/a11y-authenticated.spec.ts` | skipped | intended axe host |
| `e2e/smoke.spec.ts` | guest `/messages` → login | — |

---

## RTL_MATRIX

| Route | `dir=rtl` (ar cookie) | Logical CSS | Residual |
|-------|----------------------|-------------|----------|
| Landing | PASS (Playwright) | partial | many `left`/`ml` remain in CSS |
| Login / pricing | PASS (Playwright) | partial | |
| Welcome / chat / settings / leaderboard / market | expected via `documentElement.dir` | toggle + back chevron | not a full sweep |
| Dialogs | MotionDialog inert | — | |

**RTL_CRITICAL_ROUTES:** **PARTIAL** — `dir=rtl` on landing/login/pricing (Playwright); logical start/end on skip-link, chat `ms-auto`, streak rail, chevrons `rtl:rotate-180`. Not a complete physical-utility conversion.

---

## LIGHTHOUSE_RESULTS

`lighthouserc.cjs` collects **performance, accessibility, best-practices, seo**. Thresholds were not reduced.

| URL | Perf threshold | A11y | SEO (this HEAD, measured) |
|-----|----------------|------|---------------------------|
| `/` | warn ≥ 0.65 | error ≥ 0.85 | **1.00** (all SEO audits pass) |
| `/pricing` | warn ≥ 0.65 | error ≥ 0.85 | **1.00** |
| `/privacy` | warn ≥ 0.65 | error ≥ 0.85 | **1.00** |
| `/terms` `/cookies` `/kvkk` | same | ≥ 0.85 | **1.00** each |
| `/login` | same | ≥ 0.85 | **off** (`is-crawlable` off — noindex is correct) |

LIGHTHOUSE_SEO: **PASS** (≥ 0.95 on every indexable public URL tested). `/login` was not scored as an indexable SEO page.

---

## Issue records

### SEO-001 — robots + sitemap
- **BEFORE:** No Next metadata robots/sitemap.
- **CURRENT_REPRODUCTION:** `app/robots.ts`, `app/sitemap.ts`.
- **ROOT_CAUSE:** Missing framework-native SEO routes.
- **CHANGE:** Policy registry; sitemap only `SEO_INDEXABLE_PATHS`; robots disallow app/API; sitemap URL on production origin.
- **TESTS_ADDED:** `tests/architecture/seo-contract.test.ts`, `e2e/seo.spec.ts`.
- **RUNTIME_EVIDENCE:** Playwright GET `/robots.txt` `/sitemap.xml`.
- **STATUS:** VERIFIED
- **FILES_CHANGED:** `app/robots.ts`, `app/sitemap.ts`, `lib/seo/policy.ts`, `lib/seo/origin.ts`
- **RESIDUAL_RISK:** Robots is guidance, not auth.

### SEO-002 — Open Graph + Twitter
- **BEFORE:** Incomplete social tags.
- **CHANGE:** `publicPageMetadata` / `rootMetadata`; `app/opengraph-image.tsx` 1200×630.
- **STATUS:** VERIFIED
- **RESIDUAL_RISK:** OG image is generated via `next/og` (cached), not a static PNG in `/public`.

### SEO-003 — canonical + hreflang
- **BEFORE:** No canonicals; audit assumed many locales.
- **CHANGE:** Strategy B documented and tested; no fake hreflang.
- **STATUS:** VERIFIED (strategy proven correct)
- **RESIDUAL_RISK:** Localized crawlable URLs remain a future enhancement.

### SEO-004 — stray `public/index.html`
- **BEFORE:** Capacitor fallback in Next public root.
- **CHANGE:** Removed; `native/offline-index.html` copied in `scripts/cap-sync.mjs`; `/index.html` → `/`.
- **STATUS:** VERIFIED
- **RESIDUAL_RISK:** Native sync must run for Capacitor assets.

### UX-002 — raw Turkish errors
- **CHANGE:** SSE `{ code: "STREAM_ERROR" }`; UI uses `errorToMessage` only.
- **STATUS:** VERIFIED
- **RESIDUAL_RISK:** Some API routes still have Turkish *machine* messages; they must not be shown raw.

### UX-003 — demo flash
- **CHANGE:** gems 0; preview false until guest apply; chrome skeleton.
- **STATUS:** VERIFIED
- **RESIDUAL_RISK:** `applyGuestState` still uses DEMO profile after confirmed guest — middleware should keep guests off product routes.

### UX-004 — error taxonomy
- **CHANGE:** NETWORK, SESSION_EXPIRED, UPLOAD_TOO_LARGE, UNSUPPORTED_IMAGE, ANALYSIS_UNAVAILABLE, SAVE_FAILED, PROVIDER_UNAVAILABLE, STREAM_ERROR.
- **STATUS:** VERIFIED

### UX-006 — leaderboard error ≠ empty
- **STATUS:** VERIFIED

### UX-007 — analytics confirm
- **STATUS:** VERIFIED (catch + failed + retry)

### UX-008 — fake guest photo success
- **CHANGE:** Camera/picker no-op unless authenticated; analysis only via API.
- **STATUS:** VERIFIED
- **RESIDUAL_RISK:** Guest text demo bubbles remain; they do not claim photo analysis.

### UX-009 — checklist false completion
- **CHANGE:** No complete-on-click; `chatDone` from `chat_messages` sender=user exists.
- **STATUS:** VERIFIED

### UX-010 — rich card i18n
- **STATUS:** VERIFIED (TR/EN/DE/FR/ES/IT/AR keys)

### UX-011 — logout confirm
- **STATUS:** VERIFIED (MotionDialog, Escape via existing dialog)

### UX-001 recheck
- **STATUS:** VERIFIED_BY_PRIOR_WAVE_EVIDENCE (same reviewed picker; SEO flags in same file)

### UX-005 recheck
- **STATUS:** VERIFIED_BY_PRIOR_WAVE_EVIDENCE (`message-lifecycle` + LiveChatPanel failed/retry)

### A11Y-002 — contrast
- **CHANGE:** Dark `text-zinc-500/600` remapped toward muted AA tokens.
- **STATUS:** VERIFIED
- **RESIDUAL_RISK:** Light theme not fully tokenized.

### A11Y-003 + TEST-003
- **CHANGE:** Public landmark/H1/robots E2E; authenticated suite skip-gated.
- **STATUS:** BLOCKED (authenticated axe)
- **RESIDUAL_RISK:** Needs `E2E_AUTH_ENABLED` + OTP secrets.

### A11Y-004 — modal isolation
- **CHANGE:** Sibling `inert` walk; do not inert the dialog.
- **STATUS:** VERIFIED

### A11Y-005 — RTL
- **CHANGE:** `dir` on html; toggle `start-` + rtl translate; header chevron `rtl:rotate-180`.
- **STATUS:** VERIFIED with residual (not a full utility conversion)

### A11Y-007
- **STATUS:** VERIFIED_BY_WAVE_1_EVIDENCE (`OtpDigitInput` only)

### A11Y-008
- **STATUS:** VERIFIED

### A11Y-009
- **STATUS:** VERIFIED (touch-44 on key controls; not every icon in the product)

### A11Y-010
- **STATUS:** VERIFIED (toggles + language picker)

### A11Y-011
- **STATUS:** VERIFIED (podium skips inline animation under reduced motion; central CSS reduce remains)

### A11Y-012
- **STATUS:** VERIFIED (labels + nutrition progressbar)
- **RESIDUAL_RISK:** Other score bars may still be visual-only.

### A11Y-001 recheck
- **STATUS:** VERIFIED_BY_WAVE_1_EVIDENCE (`role="log"`, `aria-live`, typing sr-only)

### A11Y-006 recheck
- **STATUS:** VERIFIED_BY_WAVE_1_EVIDENCE + `tests/unit/form-a11y-regression.test.ts`

### TEST-004
- **STATUS:** VERIFIED (gate 0.58; picker unchanged)

### ARCH-001
- **CHANGE:** Middleware guest redirect; app layout still dynamic (`headers()` for CSP nonce). Marketing remains `force-static`.
- **STATUS:** VERIFIED

---

## Score reassessment (current architecture)

| Category | Score | Why |
|----------|-------|-----|
| UX | 95 | LOADING/EMPTY/ERROR/SUCCESS distinctions closed on chat, analytics, leaderboard, photo, checklist, logout. Guest demo does not claim a backend analysis. Residual: guest scripted chat still exists (honestly labeled). |
| Accessibility | 93 | Public landmarks/H1/named controls/progressbars/modal inert/contrast/RTL direction proven. Deducted for **no authenticated axe** and **no VoiceOver/NVDA session** (evidence confidence, not erased implementation). |
| SEO | 96 | Runtime 200 + unique titles/descriptions + absolute canonicals + robots index + OG/Twitter + JSON-LD + Lighthouse SEO 1.00 on all six indexable URLs. Strategy B is correct; locale-prefixed URLs were not invented. |
| Frontend | 94 | Public E2E + typecheck/lint/vitest/build/bundle pass. Deducted for authenticated product E2E remaining external. |
| Architecture | 95 | Marketing/static vs app/dynamic split; pricing moved out of `headers()` layout; SEO policy registry; OG asset not treated as a product path. |

VoiceOver/NVDA absence lowers accessibility evidence confidence; it does not zero the public implementation evidence.

---

## Final summary

WAVE_6_STATUS:
COMPLETE_WITH_EXTERNAL_BLOCKER
UX_SCORE:
95
ACCESSIBILITY_SCORE:
93
SEO_SCORE:
96
FRONTEND_SCORE:
94
ARCHITECTURE_SCORE:
95
SEO_OPEN:
0
UX_OPEN:
0
ACCESSIBILITY_OPEN:
1
TESTING_FRONTEND_OPEN:
1
LIGHTHOUSE_SEO:
PASS
ROBOTS:
PASS
SITEMAP:
PASS
CANONICAL:
PASS
OPEN_GRAPH:
PASS
TWITTER_METADATA:
PASS
STRUCTURED_DATA:
PASS
BROKEN_PUBLIC_LINKS:
0
PRIVATE_ROUTES_INDEXABLE:
0
AUTHENTICATED_E2E:
BLOCKED_EXTERNAL
AUTHENTICATED_AXE:
BLOCKED_EXTERNAL
RTL_CRITICAL_ROUTES:
PARTIAL
TYPECHECK:
PASS
LINT:
PASS
TESTS:
PASS
BUILD:
PASS
BUNDLE_BUDGET:
PASS
NPM_AUDIT_HIGH:
PASS
EXTERNAL_ACTION_REQUIRED:
E2E_AUTH_ENABLED=1 plus synthetic OTP credentials (E2E_OTP_EMAIL, E2E_OTP_CODE) for authenticated Playwright/axe. Optional: VoiceOver/NVDA session. Do not add locale-prefixed routes unless product routing already supports them.
