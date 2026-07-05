# ADR 002: defineRoute API Envelope

**Status:** Accepted · 2026-07-05

## Context

56+ API routes had inconsistent auth, rate limiting, and error shapes.

## Decision

All routes use `defineRoute` family with:

- Standard `{ success, data | error }` envelope via `ok()` / `handleApiError()`
- Declarative guards: `rateLimit`, `requireAiConsent`, `sensitiveAction`, `requireCsrf`
- OpenTelemetry span per route name

## Consequences

- (+) Security matrix testable (`tests/security/api-route-matrix.test.ts`)
- (+) Consistent client error handling
- (−) Webhooks with raw body stay allowlisted (HMAC)
