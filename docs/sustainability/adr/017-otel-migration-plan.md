# ADR 017: OpenTelemetry migration plan

**Status:** Accepted · 2026-07-05  
**Context:** Sustainability Faz 4 (TD-001)

## Decision

1. **Current:** Lightweight spans via `lib/observability/tracing.ts` — Sentry `startSpan` + breadcrumbs + structured logger (`withSpan` API)
2. **Target:** OTel SDK with Vercel + Sentry exporters (Q3 2026)
3. Migration steps:
   - ✅ Preserve `withSpan` signature; attach route `auth`/`method` + `request.id`
   - ✅ Export to Sentry performance spans (Faz 5)
   - Add `@opentelemetry/api` wrapper when cross-service correlation is needed
   - Propagate `x-request-id` as W3C trace context
   - Optional OTLP collector export
4. No breaking change to route handlers during migration

## Rationale

Full OTel tracing deferred until traffic warrants cross-service correlation
beyond single Vercel function boundaries. Sentry spans cover latency debugging
inside the app today.

## Consequences

- TD-001 tracks remaining OTel SDK work
- Until then, rely on `X-Request-ID` + Sentry spans/breadcrumbs for correlation
