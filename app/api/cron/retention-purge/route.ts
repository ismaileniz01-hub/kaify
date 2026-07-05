import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import { runRetentionPurge } from "@/lib/services/retention-purge.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/retention-purge — weekly GDPR retention enforcement. */
export const GET = defineCronRoute("/api/cron/retention-purge", async () => {
  try {
    const result = await runRetentionPurge();
    await recordCronRun("retention-purge", "ok", {
      deleted: result.deleted,
      warningsSent: result.warningsSent,
    });
    return result;
  } catch (error) {
    await recordCronRun("retention-purge", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
