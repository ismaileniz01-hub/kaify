# ADR 016: E2E testing strategy

**Status:** Accepted · 2026-07-05  
**Context:** Sustainability Faz 4

## Decision

1. **Phase 1 (current):** k6 smoke on `/api/health` in CI; integration tests for critical flows
2. **Phase 2 (TD-002):** Playwright smoke — OTP login stub → home → check-in button visible
3. E2E runs on staging only; not blocking `main` until flake rate < 2%
4. Critical paths: auth bootstrap, check-in, market purchase, settings save

## Rationale

Browser E2E is expensive and flaky without dedicated staging auth fixtures.
API integration tests cover most business logic today; E2E guards UX regressions.

## Consequences

- No Playwright in CI yet — tracked as TD-002
- Staging URL + test user required before enabling gate
