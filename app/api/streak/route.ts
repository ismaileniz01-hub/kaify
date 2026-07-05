import { defineRoute } from "@/lib/api/route-handler";
import { getStreakStatus } from "@/lib/services/streak-status.service";

export const dynamic = "force-dynamic";

/** GET /api/streak — current streak status (read-only). */
export const GET = defineRoute(
  { route: "GET /api/streak" },
  async ({ user }) => getStreakStatus(user.id),
);
