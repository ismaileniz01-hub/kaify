import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import { processDomainEventOutbox } from "@/lib/services/outbox-processor.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/outbox — process domain event outbox (hourly). */
export const GET = defineCronRoute("/api/cron/outbox", async () => {
  try {
    const result = await processDomainEventOutbox();
    await recordCronRun("outbox", "ok", { processed: result.processed });
    return result;
  } catch (error) {
    await recordCronRun("outbox", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
