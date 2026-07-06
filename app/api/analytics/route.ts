import { defineRoute } from "@/lib/api/route-handler";
import { cachedWithStale } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { loadAnalyticsBundle } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

/** GET /api/analytics — today's stats + weekly steps. */
export const GET = defineRoute(
  { route: "GET /api/analytics" },
  async ({ user }) =>
    cachedWithStale(
      CacheKeys.analyticsBundle(user.id),
      CacheTTL.analyticsUser,
      CacheTTL.analyticsUserStale,
      () => loadAnalyticsBundle(user.id),
    ),
);
