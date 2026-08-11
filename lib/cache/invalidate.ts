import { cacheDelete, cacheDeleteByPattern, staleCompanionKey } from "@/lib/cache";
import { CacheInvalidation, CachePatterns } from "@/lib/cache/keys";

/** Clears cached home screen bundle (exact day key + stale + legacy variants). */
export async function invalidateHomeBundleCache(userId: string): Promise<void> {
  const exact = CacheInvalidation.homeBundle(userId);
  await Promise.all([
    ...exact.flatMap((key) => [
      cacheDelete(key),
      cacheDelete(staleCompanionKey(key)),
    ]),
    // Legacy v2 locale-fragmented keys and any other day variants.
    cacheDeleteByPattern(CachePatterns.homeBundleAll(userId)),
  ]);
}

/** Clears per-user leaderboard rank after streak changes. */
export async function invalidateLeaderboardRankCache(userId: string): Promise<void> {
  await Promise.all(
    CacheInvalidation.leaderboardRank(userId).map((key) => cacheDelete(key)),
  );
}

/** Clears short-lived session slices (gems/streak/kai). */
export async function invalidateSessionSliceCaches(userId: string): Promise<void> {
  await Promise.all(
    CacheInvalidation.sessionSlices(userId).map((key) => cacheDelete(key)),
  );
}

/** Clears analytics + home caches after fitness data writes. */
export async function invalidateUserReadCaches(userId: string): Promise<void> {
  await Promise.all([
    ...CacheInvalidation.analyticsUser(userId).flatMap((key) => [
      cacheDelete(key),
      cacheDelete(staleCompanionKey(key)),
    ]),
    ...CacheInvalidation.sessionSlices(userId).map((key) => cacheDelete(key)),
    cacheDeleteByPattern(CachePatterns.homeBundleAll(userId)),
  ]);
}

/**
 * Purges every user-derived Redis namespace after account deletion.
 * Must not rely solely on TTL — erasure requires active invalidation.
 */
export async function purgeUserCaches(userId: string): Promise<void> {
  await Promise.all([
    cacheDeleteByPattern(CachePatterns.homeBundleAll(userId)),
    cacheDeleteByPattern(CachePatterns.analyticsUser(userId)),
    cacheDeleteByPattern(CachePatterns.sessionSlices(userId)),
    cacheDeleteByPattern(CachePatterns.leaderboardRank(userId)),
    cacheDeleteByPattern(CachePatterns.avatarSigned(userId)),
    // Exact known keys (in case SCAN misses edge encodings).
    ...CacheInvalidation.analyticsUser(userId).flatMap((key) => [
      cacheDelete(key),
      cacheDelete(staleCompanionKey(key)),
    ]),
    ...CacheInvalidation.sessionSlices(userId).map((key) => cacheDelete(key)),
    ...CacheInvalidation.leaderboardRank(userId).map((key) => cacheDelete(key)),
  ]);
}
