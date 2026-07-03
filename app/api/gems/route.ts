import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getGemBalance } from "@/lib/services/gem-balance.service";

export const dynamic = "force-dynamic";

/** GET /api/gems — authenticated user's gem balance. */
export async function GET() {
  try {
    const user = await requireUser();
    const balance = await getGemBalance(user.id);
    return ok(balance);
  } catch (error) {
    return handleApiError(error, { route: "/api/gems" });
  }
}
