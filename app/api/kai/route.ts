import { defineRoute } from "@/lib/api/route-handler";
import { getKaiState } from "@/lib/services/kai-state.service";

export const dynamic = "force-dynamic";

/** GET /api/kai — unlocked level + active aura + owned effects */
export const GET = defineRoute(
  { route: "GET /api/kai" },
  async ({ user }) => getKaiState(user.id),
);
