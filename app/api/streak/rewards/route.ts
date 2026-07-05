import { defineRoute } from "@/lib/api/route-handler";
import { syncStreakRewards } from "@/lib/services/streak-rewards.service";
import { getStreakStatus } from "@/lib/services/streak-status.service";

export const dynamic = "force-dynamic";

/** POST /api/streak/rewards — claim all eligible streak milestone/station gems (idempotent). */
export const POST = defineRoute(
  { route: "POST /api/streak/rewards", rateLimit: "checkin" },
  async ({ user }) => {
    const status = await getStreakStatus(user.id);
    return syncStreakRewards(user.id, status.currentStreak);
  },
);
