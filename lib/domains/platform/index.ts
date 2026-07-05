/** Cross-cutting platform utilities. */
export { cached, cachedWithStale, cacheDelete, cacheGet, cacheSet } from "@/lib/cache";
export { CacheKeys, CacheTTL, CacheInvalidation } from "@/lib/cache/keys";
export { featureFlags, isFeatureEnabled, type FeatureFlag } from "@/lib/feature-flags";
export { emitDomainEvent } from "@/lib/events/emit";
export { createDomainEvent, type DomainEvent, type DomainEventType } from "@/lib/events/types";
