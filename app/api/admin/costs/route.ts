import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { recordAdminAction } from "@/lib/services/audit.service";
import {
  acknowledgeCostAlert,
  getCacheHitStats,
  getCostByUser,
  getCostSummary,
  getQuotaEvents,
  listCostAlerts,
} from "@/lib/services/cost-admin.service";

export const dynamic = "force-dynamic";

/** GET /api/admin/costs — AI spend dashboard data. */
export const GET = defineRoute(
  { route: "GET /api/admin/costs", auth: "admin" },
  async ({ request }) => {
    const url = new URL(request.url);
    const days = Number.parseInt(url.searchParams.get("days") ?? "7", 10);

    const [summary, byUser, quotaEvents, alerts, cacheStats] = await Promise.all([
      getCostSummary(Number.isFinite(days) ? days : 7),
      getCostByUser(Number.isFinite(days) ? days : 7, 25),
      getQuotaEvents(Number.isFinite(days) ? days : 7, 40),
      listCostAlerts(15),
      getCacheHitStats(Number.isFinite(days) ? days : 7),
    ]);

    return { summary, byUser, quotaEvents, alerts, cacheStats };
  },
);

/** PATCH /api/admin/costs — acknowledge a cost alert. */
export const PATCH = defineRoute(
  { route: "PATCH /api/admin/costs", auth: "admin" },
  async ({ user, request }) => {
    const body = (await request.json()) as { alertId?: string };
    if (!body.alertId) {
      throw new ApiError("VALIDATION_ERROR", "alertId gerekli.");
    }
    await acknowledgeCostAlert(body.alertId);

    await recordAdminAction({
      adminId: user.id,
      action: "costs.alert_ack",
      targetType: "cost_alert",
      targetId: body.alertId,
      ip: getClientIP(request),
    });

    return { acknowledged: true };
  },
);
