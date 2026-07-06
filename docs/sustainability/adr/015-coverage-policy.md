# ADR 015: Coverage gate scope

**Status:** Accepted · 2026-07-05  
**Context:** Sustainability Faz 3

## Decision

1. CI coverage thresholds apply to scoped paths in `vitest.config.ts`: core `lib/api`, `lib/cache`, `lib/resilience`, etc.
2. Thresholds: **75%** statements, **70%** branches, **80%** functions (lines aligned)
3. `lib/services/**`, `lib/ai/**`, and DB-touching code are **excluded** until TD-003
4. New pure-logic modules in scoped paths must include unit tests

## Rationale

Enforcing coverage on integration-heavy services produces flaky or meaningless
tests. Gate the layers where unit tests give high signal first.

## Consequences

- Service-layer bugs caught by integration tests, not coverage %
- TD-003 tracks expansion to services when mock infrastructure is stable
