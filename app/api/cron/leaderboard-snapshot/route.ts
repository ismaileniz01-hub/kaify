import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import { refreshLeaderboardSnapshots } from "@/lib/services/leaderboard-snapshot.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/leaderboard-snapshot — refresh DB snapshots + warm Redis (every 15m). */
export const GET = defineCronRoute("/api/cron/leaderboard-snapshot", async () => {
  try {
    const result = await refreshLeaderboardSnapshots();
    await recordCronRun("leaderboard-snapshot", "ok", result);
    return result;
  } catch (error) {
    await recordCronRun("leaderboard-snapshot", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
