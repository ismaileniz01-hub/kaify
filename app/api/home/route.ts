import { assertAiAvailable } from "@/lib/api/ai-guard";
import { requireUser } from "@/lib/api/auth-guard";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { assertUserDailyAiBudget } from "@/lib/ai/daily-cost-cap";
import { cachedWithStale } from "@/lib/cache";
import { withSpan } from "@/lib/observability/tracing";
import { getHomeData } from "@/lib/services/home.service";

export const dynamic = "force-dynamic";

function homeCacheKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `home:v1:${userId}:${day}`;
}

/** GET /api/home — welcome screen bundle (motivation, tip, stats). */
export async function GET() {
  return withSpan("GET /api/home", async () => {
    try {
      const user = await requireUser();
      await enforceUserRateLimit(user.id, "checkin");
      await assertAiAvailable();
      await assertUserDailyAiBudget(user.id);

      const home = await cachedWithStale(
        homeCacheKey(user.id),
        300,
        86_400,
        () => getHomeData(user.id),
      );
      return ok(home);
    } catch (error) {
      return handleApiError(error, { route: "GET /api/home" });
    }
  });
}
