import { NextRequest } from "next/server";
import { allowMethods, apiError, leaderboardQuerySchema } from "@/lib/api-security";
import { handleApiError } from "@/lib/api/response";
import { getPublicGlobalLeaderboard } from "@/lib/services/leaderboard.service";

export const dynamic = "force-dynamic";

/** GET /api/leaderboard — public global leaderboard (legacy shape for demo/unauth clients). */
export async function GET(request: NextRequest) {
  const methodCheck = allowMethods(request, ["GET"]);
  if (methodCheck) return methodCheck;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = leaderboardQuerySchema.safeParse({
      userId: searchParams.get("userId") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query parameters.", 400);
    }

    const result = await getPublicGlobalLeaderboard({ limit: 10 });

    const leaderboard = result.leaderboard.map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      flagCode: entry.flagCode,
      streak: entry.streak,
      avatar: entry.avatar || "/kaify-logo.png",
    }));

    const cleanUserId = parsed.data.userId ?? null;
    const userRank = cleanUserId
      ? leaderboard.findIndex((u) => u.userId === cleanUserId) + 1
      : null;

    return Response.json({
      leaderboard,
      userRank: userRank && userRank > 0 ? userRank : null,
      totalUsers: result.totalUsers,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/leaderboard" });
  }
}
