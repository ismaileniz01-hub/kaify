# Architecture Verification Sprint — 2026-07

Target: **Mimari 80+** (Faz 1–2 gate)

## A — Structure

- [x] `docs/architecture/README.md`
- [x] Bounded contexts documented
- [x] 5 ADRs published
- [x] `lib/domains/*` facades exist
- [x] Cache keys centralized (`lib/cache/keys.ts`)
- [x] Feature flags module (`lib/feature-flags.ts`)
- [x] Domain events emit on delete/export

## B — CI tests

- [x] `tests/architecture/domains.test.ts` PASS
- [x] `tests/architecture/cache-keys.test.ts` PASS
- [x] `tests/architecture/v1-routes.test.ts` PASS
- [x] `tests/security/api-route-matrix.test.ts` PASS

## C — Manual

| Check | Expected | Result |
|-------|----------|--------|
| Market prices match DB | UI = `market_items.price` | |
| No hardcoded gem prices in UI | grep clean | |
| New route uses defineRoute | api-route-matrix | |
| `.env.example` complete | All prod vars documented | |
| `/api/v1/profile` returns same as `/api/profile` | Identical envelope | |

## D — Faz 3 (88) ✅

- [x] Integration tests: check-in, market purchase, outbox emit
- [x] Read/write repository split for analytics
- [x] `domain_events` outbox table + hourly cron

## E — Faz 4 (92+) ✅

- [x] `/api/v1` wrappers (28 routes)
- [x] CODEOWNERS
- [x] Developer onboarding doc
- [x] Legacy API Deprecation/Sunset headers

Signed: __________ Date: __________
