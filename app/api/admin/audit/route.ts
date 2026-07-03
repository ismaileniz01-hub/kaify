import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { listAuditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

/** GET /api/admin/audit — recent admin action trail. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const items = await listAuditLog(Number.isFinite(limit) ? limit : 50);
    return ok({ items });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/audit" });
  }
}
