import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getStreakStatus } from "@/lib/services/streak-status.service";

export const dynamic = "force-dynamic";

/** GET /api/streak — current streak status (read-only). */
export async function GET() {
  try {
    const user = await requireUser();
    const status = await getStreakStatus(user.id);
    return ok(status);
  } catch (error) {
    return handleApiError(error, { route: "/api/streak" });
  }
}
