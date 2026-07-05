# ADR 008: Coaches catalog cache

**Status:** Accepted · 2026-07-05  
**Context:** Scalability Faz 2

## Decision

Cache `listActiveCoaches()` and successful `getCoachOrThrow()` hits in Redis (TTL 3600s). Coaches table is static (4 rows, rarely changes).

NOT_FOUND responses are never cached.

## Invalidation

Admin coach seed changes → manual `CacheInvalidation.coachesCatalog()` or TTL expiry.
