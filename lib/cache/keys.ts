/**
 * Central cache key registry (Architecture Faz 2–3).
 * All Redis keys and TTLs live here — services must not invent ad-hoc keys.
 */

export const CacheTTL = {
  marketCatalog: 300,
  leaderboardHot: 60,
  leaderboardStale: 3600,
  analyticsUser: 120,
  analyticsUserStale: 1200,
  avatarSigned: 1800,
  coachesCatalog: 3600,
  coachById: 3600,
  homeBundle: 300,
  homeBundleStale: 86_400,
} as const;

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const CacheKeys = {
  marketItems: () => "market:items:v2",
  analyticsBundle: (userId: string) => `analytics:bundle:v1:${userId}`,
  analyticsToday: (userId: string) => `analytics:today:v1:${userId}`,
  /** @deprecated use analyticsBundle — kept for invalidation compat */
  analyticsUser: (userId: string) => `analytics:bundle:v1:${userId}`,
  homeBundle: (userId: string, day = utcDayKey(), locale = "default") =>
    `home:bundle:v2:${userId}:${day}:${locale}`,
  coachesCatalog: () => "coaches:catalog:v1",
  coachById: (coachId: string) => `coaches:item:v1:${coachId}`,
  leaderboardGlobal: (limit: number, offset: number) =>
    `lb:global:v1:${limit}:${offset}`,
  leaderboardCountry: (limit: number) => `lb:country:v1:${limit}`,
  leaderboardSnapshotKey: (kind: "global" | "country", limit: number, offset = 0) =>
    kind === "global" ? `global:${limit}:${offset}` : `country:${limit}`,
  avatarSigned: (storagePath: string) => `avatar:signed:v1:${storagePath}`,
} as const;

/** Invalidate after analytics writes. */
export const CacheInvalidation = {
  marketCatalog: [CacheKeys.marketItems()],
  analyticsUser: (userId: string) => [
    CacheKeys.analyticsBundle(userId),
    CacheKeys.analyticsToday(userId),
    CacheKeys.homeBundle(userId),
  ],
  homeBundle: (userId: string) => [CacheKeys.homeBundle(userId)],
  coachesCatalog: () => [CacheKeys.coachesCatalog()],
  allLeaderboards: () => [
    // Prefix invalidation not supported — document TTL-bound freshness (60s).
    // Admin catalog changes use marketCatalog only.
  ],
} as const;
