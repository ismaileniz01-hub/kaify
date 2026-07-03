import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import { getClientIP } from "@/lib/api-security";
import { listReferrals } from "@/lib/services/admin.service";
import { recordAdminAction } from "@/lib/services/audit.service";
import { paginationQuerySchema } from "@/lib/validations/pagination.schema";

export const runtime = "nodejs";

/** GET /api/admin/referrals — admin-only paginated referral list. */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const url = new URL(request.url);
    const query = paginationQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!query.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz sorgu.", query.error.issues);
    }

    const page = await listReferrals({
      limit: query.data.limit,
      offset: query.data.offset,
    });

    await recordAdminAction({
      adminId: admin.id,
      action: "referrals.list",
      metadata: { limit: query.data.limit, offset: query.data.offset },
      ip: getClientIP(request),
    });

    return ok(page);
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/referrals" });
  }
}
