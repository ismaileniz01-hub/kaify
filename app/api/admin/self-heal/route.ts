import { requireAdmin } from "@/lib/api/admin-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { buildSelfHealSnapshot } from "@/lib/resilience/self-heal-report";
import { exitDegradedMode } from "@/lib/resilience/degraded-mode";
import { resetCircuit, getCircuitSnapshots } from "@/lib/resilience/circuit";

export const dynamic = "force-dynamic";

/** GET /api/admin/self-heal — telemetry + optional AI diagnostic report. */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const withAi = url.searchParams.get("ai") === "1";

    const snapshot = await buildSelfHealSnapshot({ includeAiReport: withAi });
    return ok(snapshot);
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/self-heal" });
  }
}

/** POST /api/admin/self-heal — manual recovery (clear degraded + reset circuits). */
export async function POST() {
  try {
    await requireAdmin();

    const before = getCircuitSnapshots().filter((c) => c.open);
    await exitDegradedMode();
    for (const c of before) {
      resetCircuit(c.name);
    }

    return ok({
      clearedDegraded: true,
      resetCircuits: before.map((c) => c.name),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/self-heal" });
  }
}
