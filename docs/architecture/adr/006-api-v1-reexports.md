# ADR 006: API Versioning via /api/v1 Re-exports

**Status:** Accepted · 2026-07-05

## Context

Mobile and web clients need a stable API contract. Breaking changes to `/api/**` would silently break shipped apps.

## Decision

- Introduce `/api/v1/**` as **thin re-exports** of existing route handlers
- Canonical list in `lib/api/v1-manifest.ts`
- Legacy `/api/**` (user-facing) gets `Deprecation` + `Sunset: 2027-01-01` headers via middleware
- v1 responses include `X-API-Version: v1`

Excluded from deprecation: cron, admin, webhooks, auth, health probe, waitlist.

## Consequences

- (+) Zero logic duplication — single handler source
- (+) Clients can migrate path-by-path
- (+) Breaking changes require v2 prefix, not silent edits
- (−) Route count doubles (mitigated: 1-line files)
- (−) OpenAPI generation still future work

## Not in v1

Cron, admin, webhooks, marketing endpoints remain unversioned internal surface.
