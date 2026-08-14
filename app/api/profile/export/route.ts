import { defineRouteRaw } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { streamUserDataExport } from "@/lib/services/account.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/profile/export
 * Streams all data the app holds about the caller as a downloadable JSON file
 * (KVKK/GDPR right to data portability). Incomplete streams omit complete:true.
 */
export const GET = defineRouteRaw(
  {
    route: "GET /api/profile/export",
    sensitiveAction: true,
    rateLimit: "profile_export",
    requireCsrf: true,
  },
  async ({ user, request }) => {
    const stream = streamUserDataExport(user.id, {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get("user-agent"),
    });

    const filename = `kaify-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
);
