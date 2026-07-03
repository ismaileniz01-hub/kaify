import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/response";
import { exportUserData } from "@/lib/services/account.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/profile/export
 * Returns all data the app holds about the caller as a downloadable JSON file
 * (KVKK/GDPR right to data portability).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const data = await exportUserData(user.id);

    const filename = `kaify-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/profile/export" });
  }
}
