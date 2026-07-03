import { NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import { getCountryLeaderboard } from "@/lib/services/leaderboard.service";
import { paginationQuerySchema } from "@/lib/validations/pagination.schema";

export const runtime = "nodejs";

/** GET /api/leaderboard/country — countries ranked by aggregate streak. */
export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const url = new URL(request.url);
    const query = paginationQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!query.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz sorgu.", query.error.issues);
    }

    const result = await getCountryLeaderboard({ limit: query.data.limit });

    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/leaderboard/country" });
  }
}
