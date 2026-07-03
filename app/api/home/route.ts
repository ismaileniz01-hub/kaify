import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { cachedWithStale } from "@/lib/cache";
import { getHomeData } from "@/lib/services/home.service";

export const dynamic = "force-dynamic";

function homeCacheKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `home:v1:${userId}:${day}`;
}

/** GET /api/home — welcome screen bundle (motivation, tip, stats). */
export async function GET() {
  try {
    const user = await requireUser();
    const home = await cachedWithStale(
      homeCacheKey(user.id),
      300,
      86_400,
      () => getHomeData(user.id),
    );
    return ok(home);
  } catch (error) {
    return handleApiError(error, { route: "/api/home" });
  }
}
