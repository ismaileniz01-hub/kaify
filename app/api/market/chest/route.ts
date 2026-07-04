import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import {
  claimDailyChest,
  getDailyChestStatus,
} from "@/lib/services/daily-chest.service";

export const dynamic = "force-dynamic";

/** GET /api/market/chest — daily chest availability. */
export async function GET() {
  try {
    const user = await requireUser();
    const status = await getDailyChestStatus(user.id);
    return ok(status);
  } catch (error) {
    return handleApiError(error, { route: "/api/market/chest" });
  }
}

/** POST /api/market/chest — roll reward and grant (once per UTC day). */
export async function POST() {
  try {
    const user = await requireUser();
    const result = await claimDailyChest(user.id);
    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/market/chest" });
  }
}
