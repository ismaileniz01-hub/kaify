import { defineRoute } from "@/lib/api/route-handler";
import { cachedWithStale } from "@/lib/cache";
import { getAnalyticsBundle } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

function analyticsCacheKey(userId: string): string {
  return `analytics:v1:${userId}`;
}

/** GET /api/analytics — today's stats + weekly steps. */
export const GET = defineRoute(
  { route: "GET /api/analytics" },
  async ({ user }) =>
    cachedWithStale(analyticsCacheKey(user.id), 15, 120, () =>
      getAnalyticsBundle(user.id),
    ),
);
