import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { recordAdminAction } from "@/lib/services/audit.service";
import { buildSelfHealSnapshot } from "@/lib/resilience/self-heal-report";
import { exitDegradedMode } from "@/lib/resilience/degraded-mode";
import { resetCircuit, getCircuitSnapshots } from "@/lib/resilience/circuit";

export const dynamic = "force-dynamic";

/** GET /api/admin/self-heal — telemetry + optional AI diagnostic report. */
export const GET = defineRoute(
  { route: "GET /api/admin/self-heal", auth: "admin" },
  async ({ user, request }) => {
    const url = new URL(request.url);
    const withAi = url.searchParams.get("ai") === "1";

    const snapshot = await buildSelfHealSnapshot({ includeAiReport: withAi });

    await recordAdminAction({
      adminId: user.id,
      action: "self_heal.read",
      metadata: { withAi },
      ip: getClientIP(request),
    });

    return snapshot;
  },
);

/** POST /api/admin/self-heal — manual recovery (clear degraded + reset circuits). */
export const POST = defineRoute(
  { route: "POST /api/admin/self-heal", auth: "admin" },
  async ({ user, request }) => {
    const before = getCircuitSnapshots().filter((c) => c.open);
    await exitDegradedMode();
    for (const c of before) {
      resetCircuit(c.name);
    }

    const resetCircuits = before.map((c) => c.name);

    await recordAdminAction({
      adminId: user.id,
      action: "self_heal.reset",
      metadata: { resetCircuits, clearedDegraded: true },
      ip: getClientIP(request),
    });

    return {
      clearedDegraded: true,
      resetCircuits,
    };
  },
);
