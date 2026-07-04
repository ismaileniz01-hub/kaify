import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { listAuditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

const MAX_AUDIT_LIMIT = 200;

/** GET /api/admin/audit — recent admin action trail. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const parsed = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), MAX_AUDIT_LIMIT)
      : 50;
    const items = await listAuditLog(limit);
    return ok({ items });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/audit" });
  }
}
