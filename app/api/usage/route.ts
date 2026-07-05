import { defineRoute } from "@/lib/api/route-handler";
import { getUsageStatus } from "@/lib/services/usage-limit.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage
 * Returns the authenticated user's remaining limits and usage counters for
 * text tokens (monthly), Maya photos (daily), and Leo photos (weekly).
 */
export const GET = defineRoute(
  { route: "GET /api/usage" },
  async () => getUsageStatus(),
);
