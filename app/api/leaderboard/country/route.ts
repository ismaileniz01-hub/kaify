import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getCountryLeaderboard } from "@/lib/services/leaderboard.service";
import { paginationQuerySchema } from "@/lib/validations/pagination.schema";

export const runtime = "nodejs";

/** GET /api/leaderboard/country — countries ranked by aggregate streak. */
export const GET = defineRoute(
  { route: "GET /api/leaderboard/country" },
  async ({ request }) => {
    const url = new URL(request.url);
    const query = paginationQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!query.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz sorgu.", query.error.issues);
    }

    return getCountryLeaderboard({ limit: query.data.limit });
  },
);
