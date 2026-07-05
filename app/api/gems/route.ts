import { defineRoute } from "@/lib/api/route-handler";
import { getGemBalance } from "@/lib/services/gem-balance.service";

export const dynamic = "force-dynamic";

/** GET /api/gems — authenticated user's gem balance. */
export const GET = defineRoute(
  { route: "GET /api/gems" },
  async ({ user }) => getGemBalance(user.id),
);
