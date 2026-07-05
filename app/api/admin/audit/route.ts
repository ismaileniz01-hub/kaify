import { defineRoute } from "@/lib/api/route-handler";
import { listAuditLog } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

const MAX_AUDIT_LIMIT = 200;

/** GET /api/admin/audit — recent admin action trail. */
export const GET = defineRoute(
  { route: "GET /api/admin/audit", auth: "admin" },
  async ({ request }) => {
    const url = new URL(request.url);
    const parsed = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), MAX_AUDIT_LIMIT)
      : 50;
    const items = await listAuditLog(limit);
    return { items };
  },
);
