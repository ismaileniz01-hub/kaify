import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { listReferrals } from "@/lib/services/admin.service";
import { recordAdminAction } from "@/lib/services/audit.service";
import { paginationQuerySchema } from "@/lib/validations/pagination.schema";

export const runtime = "nodejs";

/** GET /api/admin/referrals — admin-only paginated referral list. */
export const GET = defineRoute(
  { route: "GET /api/admin/referrals", auth: "admin" },
  async ({ user, request }) => {
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
      adminId: user.id,
      action: "referrals.list",
      metadata: { limit: query.data.limit, offset: query.data.offset },
      ip: getClientIP(request),
    });

    return page;
  },
);
