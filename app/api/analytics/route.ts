import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { cachedWithStale } from "@/lib/cache";
import { getAnalyticsBundle } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

function analyticsCacheKey(userId: string): string {
  return `analytics:v1:${userId}`;
}

/** GET /api/analytics — today's stats + weekly steps. */
export async function GET() {
  try {
    const user = await requireUser();
    const data = await cachedWithStale(
      analyticsCacheKey(user.id),
      15,
      120,
      () => getAnalyticsBundle(user.id),
    );
    return ok(data);
  } catch (error) {
    return handleApiError(error, { route: "/api/analytics" });
  }
}
