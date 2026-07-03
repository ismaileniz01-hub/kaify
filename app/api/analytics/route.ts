import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getAnalyticsBundle } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

/** GET /api/analytics — today's stats + weekly steps. */
export async function GET() {
  try {
    const user = await requireUser();
    const data = await getAnalyticsBundle(user.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error, { route: "/api/analytics" });
  }
}
