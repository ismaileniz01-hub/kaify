import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
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
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const days = Number.parseInt(url.searchParams.get("days") ?? "7", 10);

    const [summary, byUser, quotaEvents, alerts, cacheStats] = await Promise.all([
      getCostSummary(Number.isFinite(days) ? days : 7),
      getCostByUser(Number.isFinite(days) ? days : 7, 25),
      getQuotaEvents(Number.isFinite(days) ? days : 7, 40),
      listCostAlerts(15),
      getCacheHitStats(Number.isFinite(days) ? days : 7),
    ]);

    return ok({ summary, byUser, quotaEvents, alerts, cacheStats });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/costs" });
  }
}

/** PATCH /api/admin/costs — acknowledge a cost alert. */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { alertId?: string };
    if (!body.alertId) {
      throw new ApiError("VALIDATION_ERROR", "alertId gerekli.");
    }
    await acknowledgeCostAlert(body.alertId);

    await recordAdminAction({
      adminId: admin.id,
      action: "costs.alert_ack",
      targetType: "cost_alert",
      targetId: body.alertId,
      ip: getClientIP(request),
    });

    return ok({ acknowledged: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/costs" });
  }
}
