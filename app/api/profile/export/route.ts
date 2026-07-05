import { defineRouteRaw } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { exportUserData, logDataExport } from "@/lib/services/account.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/profile/export
 * Returns all data the app holds about the caller as a downloadable JSON file
 * (KVKK/GDPR right to data portability).
 */
export const GET = defineRouteRaw(
  {
    route: "GET /api/profile/export",
    sensitiveAction: true,
    rateLimit: "profile_export",
    requireCsrf: true,
  },
  async ({ user, request }) => {
    const data = await exportUserData(user.id);

    await logDataExport(user.id, data, {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get("user-agent"),
    });

    const filename = `kaify-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
);
