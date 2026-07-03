import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getUsageStatus } from "@/lib/services/usage-limit.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage
 * Returns the authenticated user's remaining limits and usage counters for
 * text tokens (monthly), Maya photos (daily), and Leo photos (weekly).
 */
export async function GET() {
  try {
    await requireUser();
    const status = await getUsageStatus();
    return ok(status);
  } catch (error) {
    return handleApiError(error, { route: "/api/usage" });
  }
}
