# Cache Strategy

Last updated: 2026-07-05

## Principles

1. **Fail-open** — cache errors never break requests
2. **Central keys** — `lib/cache/keys.ts` only
3. **User-specific data** — prefer live DB or short TTL
4. **Shared read models** — cache with stale fallback

## Registry

| Key | TTL (hot) | Stale | Invalidation |
|-----|-----------|-------|--------------|
| `market:items:v2` | 300s | — | Admin catalog change |
| `lb:global:v1:*` | 60s | 3600s | TTL only |
| `lb:country:v1:*` | 60s | 3600s | TTL only |
| `analytics:v1:{userId}` | — | — | On analytics write |
| `analytics:bundle:v1:{userId}` | 120s | — | On analytics write |
| `analytics:today:v1:{userId}` | 120s | — | On analytics write |
| `home:bundle:v1:{userId}:{day}` | 300s | 86400s stale | Check-in + analytics write |
| `coaches:catalog:v1` | 3600s | — | Admin coach change |
| `coaches:item:v1:{id}` | 3600s | — | Admin coach change |

## Code

```typescript
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { cached } from "@/lib/cache";

await cached(CacheKeys.marketItems(), CacheTTL.marketCatalog, producer);
```

## Future (Faz 3)

- Prefix invalidation via Redis SCAN for leaderboard admin refresh
- Read replica for leaderboard RPCs at scale
