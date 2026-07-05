# Architecture Layers

## 1. API layer (`app/api/**`)

Every route uses `defineRoute` / `defineDynamicRoute` / `defineCronRoute` from `lib/api/route-handler.ts`.

Guard order: auth → rate limit → CSRF → consent → AI guards → handler.

See [api-inventory.md](../security/api-inventory.md).

## 2. Service layer (`lib/services/**`)

One service per aggregate/use case. Services:

- Never import from `app/**`
- Use `createServerSupabaseClient()` for user-scoped reads
- Use `createAdminSupabaseClient()` only for RPC mutations
- Throw `ApiError` with stable codes

## 3. Domain facades (`lib/domains/**`)

Re-export stable entry points per bounded context. **New code** should import:

```typescript
import { market } from "@/lib/domains";
await market.getMarketState(userId);
```

Legacy `lib/services/*` imports remain valid during migration.

## 4. Data layer (Supabase)

- **RLS** on all user tables
- **Mutations** via SECURITY DEFINER RPCs (`perform_daily_check_in`, `purchase_market_item`, …)
- **Types** generated in `lib/types/database.types.ts`

## 5. Cross-cutting

| Concern | Module |
|---------|--------|
| Cache | `lib/cache`, `lib/cache/keys` |
| Feature flags | `lib/feature-flags` |
| Domain events | `lib/events/*` |
| Observability | Sentry, structured logger |
