import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getCircuitSnapshots, resetCircuit } from "@/lib/resilience/circuit";
import { exitDegradedMode, getDegradedState } from "@/lib/resilience/degraded-mode";
import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function probeDatabase(): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("profiles").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * GET /api/cron/self-recovery — checks dependency health and clears degraded
 * mode + circuit breakers when the system has recovered.
 */
export const GET = defineCronRoute("/api/cron/self-recovery", async () => {
  try {
    const degradedBefore = await getDegradedState();
    const dbOk = await probeDatabase();
    const circuitsBefore = getCircuitSnapshots();
    const openCircuits = circuitsBefore.filter((c) => c.open);

    let recovered = false;

    if (dbOk && openCircuits.length === 0) {
      if (degradedBefore.active) {
        await exitDegradedMode();
        recovered = true;
      }
    }

    // Half-open probes happen automatically; manual reset only when DB is healthy
    // and circuits have been open long enough (cooldown elapsed).
    if (dbOk) {
      for (const c of openCircuits) {
        resetCircuit(c.name);
        recovered = true;
        logger.info("self-recovery reset circuit", { circuit: c.name });
      }
    }

    const payload = {
      ranAt: new Date().toISOString(),
      database: dbOk ? "ok" : "down",
      degradedBefore: degradedBefore.active,
      openCircuits: openCircuits.map((c) => c.name),
      recovered,
      degradedAfter: (await getDegradedState()).active,
    };

    await recordCronRun("self-recovery", dbOk ? "ok" : "error", payload);

    return payload;
  } catch (error) {
    await recordCronRun("self-recovery", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
