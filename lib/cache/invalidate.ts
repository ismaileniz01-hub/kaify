import { cacheDelete } from "@/lib/cache";
import { CacheInvalidation } from "@/lib/cache/keys";

/** Clears cached home screen bundle for the current UTC day. */
export async function invalidateHomeBundleCache(userId: string): Promise<void> {
  await Promise.all(
    CacheInvalidation.homeBundle(userId).map((key) => cacheDelete(key)),
  );
}

/** Clears analytics + home caches after fitness data writes. */
export async function invalidateUserReadCaches(userId: string): Promise<void> {
  await Promise.all(
    CacheInvalidation.analyticsUser(userId).map((key) => cacheDelete(key)),
  );
}
