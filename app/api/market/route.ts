import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getMarketState } from "@/lib/services/market.service";

export const dynamic = "force-dynamic";

/** GET /api/market — catalog + owned items + active aura. */
export async function GET() {
  try {
    const user = await requireUser();
    const state = await getMarketState(user.id);
    return ok(state);
  } catch (error) {
    return handleApiError(error, { route: "/api/market" });
  }
}
