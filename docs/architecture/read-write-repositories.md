# Read/Write Repository Pattern

Last updated: 2026-07-05 · Architecture Faz 3

## Analytics (implemented)

| Layer | Module | Responsibility |
|-------|--------|----------------|
| **Read** | `lib/repositories/analytics-read.repository.ts` | SELECT queries, RLS-scoped via server client |
| **Write** | `lib/repositories/analytics-write.repository.ts` | RPC upserts, health_steps batch, cache invalidation |
| **Service** | `lib/services/analytics.service.ts` | Business logic, DTO mapping, Maya meal merge |

## Rules

1. Services orchestrate; repositories do I/O only
2. User-scoped reads → `createAnalyticsReadClient()` (RLS)
3. Cross-user / admin aggregation → `createAnalyticsAdminReadClient()`
4. All writes → admin client in write repository

## Future contexts

| Context | Read repo | Write repo |
|---------|-----------|------------|
| Market | `market_items` catalog | purchase RPC (in service today) |
| Streak | streak status | check-in RPC |
| Chat | message history | insert via service |

Migrate incrementally when touching each service.
