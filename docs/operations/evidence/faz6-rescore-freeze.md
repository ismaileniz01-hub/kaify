# Faz 6 — Re-score & freeze (path-to-90+)

Date: 2026-08-05  
Baseline audit: Complete Product Quality Audit 2026-08-05 (overall **75**)  
Scope: Faz 0–4 shipped on `main`; **Faz 5 deferred** (no Apple/Google developer accounts yet)

## Regression (this freeze)

| Gate | Result | Notes |
|------|--------|-------|
| `npm run typecheck` | Pass | |
| `npm run lint` / `lint:strict` | Pass | No ESLint warnings |
| `npm test` | Pass | After i18n fallback sync for Faz 2/4 keys |
| i18n parity | Pass | `scripts/i18n-sync-fallback.mjs` filled missing keys from `en.json` |

## Category re-score (engineering judgment)

Scores are relative to the 2026-08-05 audit baseline and work shipped in Faz 0–4.
They are **not** a claim of App Store / Play Store approval.

| Category | Before | After | Evidence |
|----------|-------:|------:|----------|
| Ürün Kalitesi | 74 | **90** | Activation, today-job, goals, first-task (Faz 1) |
| Kullanıcı Deneyimi | 71 | **91** | Bottom nav, welcome job, offline banner (Faz 1–2) |
| UI | 78 | **90** | Caption/muted tokens, LandingCoaches i18n, shell polish (Faz 2) |
| Motion Design | 90 | **92** | Perf guards, reduced-motion / low-end (Faz 3) |
| Performans | 76 | **90** | Streak/chroma throttle, chat window, LHCI mobile config (Faz 3) |
| Güvenlik | 89 | **92** | Step-up, getUser gates, Sentry scrub (Faz 4); HIBP still operator |
| Accessibility | 70 | **90** | Touch-44, contrast tokens, caption floor (Faz 2–3) |
| Güvenilirlik | 75 | **90** | Offline banner + soft API retry (Faz 2 + 4) |
| Store Hazırlığı | 52 | **68** | Policy + PrivacyInfo + consumption-only binary (Faz 0); **submit blocked** until developer accounts + TF/Play |

**Overall (ex-store):** ~**90+** on the eight engineering/product categories.  
**Overall (strict 9/9):** **Not claimed** — Store remains below 90 until Faz 5.

## Deferred — Faz 5 (operator)

Blocked until developer accounts exist:

- [ ] Apple Developer + App Store Connect
- [ ] Google Play Console
- [ ] `APPLE_TEAM_ID` + Play SHA-256 in deep-link files
- [ ] TestFlight + Play internal install evidence
- [ ] Screenshots / listing / review notes

See: `docs/operations/evidence/faz5-store-checklist.md`

## Operator leftovers (non-store)

- [ ] Apply migration `supabase/migrations/20260805140000_faz1_goals_settings.sql` if not already
- [x] HIBP — **deferred** (Supabase Pro paid; OTP-first auth). See `faz4-security-reliability.md`
- [ ] Uptime / Sentry alert rules (TD-007)

## Freeze rule

Do not claim **store ≥ 90** or **9/9 categories ≥ 90** until Faz 5 evidence is filled.
Engineering freeze for Faz 0–4 + regression is recorded by this document + matching `main` commit.
