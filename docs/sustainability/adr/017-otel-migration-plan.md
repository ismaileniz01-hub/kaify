# ADR 017: OpenTelemetry migration plan

**Status:** Accepted · 2026-07-05  
**Context:** Sustainability Faz 4 (TD-001)

## Decision

1. **Current:** Lightweight spans via `lib/observability/tracing.ts` + structured logger
2. **Target:** OTel SDK with Vercel + Sentry exporters (Q3 2026)
3. Migration steps:
   - Add `@opentelemetry/api` wrapper preserving `withSpan` signature
   - Propagate `x-request-id` as trace context attribute
   - Export to Sentry performance + optional OTLP collector
4. No breaking change to route handlers during migration

## Rationale

Full OTW tracing deferred until traffic warrants cross-service correlation
beyond single Vercel function boundaries.

## Consequences

- TD-001 tracks implementation
- Until then, rely on `X-Request-ID` + Sentry breadcrumbs for correlation
