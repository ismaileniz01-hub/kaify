import { defineRoute } from "@/lib/api/route-handler";
import { getMarketState } from "@/lib/domains/market";

export const dynamic = "force-dynamic";

/** GET /api/market — catalog + owned items + active aura. */
export const GET = defineRoute(
  { route: "GET /api/market" },
  async ({ user }) => getMarketState(user.id),
);
