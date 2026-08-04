# ADR 017: OpenTelemetry migration plan

**Status:** Accepted · Updated 2026-08-04 (Faz 6)  
**Context:** Sustainability / path-to-90 TD-001

## Decision

1. **Accepted for enterprise 92+:** Lightweight spans via `lib/observability/tracing.ts` —
   Sentry `startSpan` + breadcrumbs + structured logger (`withSpan` API) on all
   `defineRoute` handlers. Pure attribute helper: `to-span-attributes.ts`.
2. **Optional future:** Full OTel SDK with Vercel + Sentry exporters — only if
   cross-service correlation beyond a single Vercel function is required.
3. Migration steps:
   - ✅ Preserve `withSpan` signature; attach route `auth`/`method` + `request.id`
   - ✅ Export to Sentry performance spans
   - ☐ Add `@opentelemetry/api` wrapper when cross-service correlation is needed
   - ☐ Propagate `x-request-id` as W3C trace context
   - ☐ Optional OTLP collector export
4. No breaking change to route handlers during any future OTel swap

## Rationale

Full OTel tracing deferred until traffic warrants cross-service correlation
beyond single Vercel function boundaries. Sentry spans cover latency debugging
inside the app today and satisfy **TD-001** for the path-to-90 Faz 6 gate.

## Consequences

- TD-001 marked **Done (Sentry spans)** in the tech-debt register
- Full OTel SDK is backlog / optional — not a release blocker
- Rely on `X-Request-ID` + Sentry spans/breadcrumbs for correlation
