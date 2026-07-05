import { allowMethods, apiError, leaderboardQuerySchema } from "@/lib/api-security";
import { defineRouteRaw } from "@/lib/api/route-handler";
import { getPublicGlobalLeaderboard } from "@/lib/services/leaderboard.service";

export const dynamic = "force-dynamic";

/** GET /api/leaderboard — public global leaderboard (legacy shape for demo/unauth clients). */
export const GET = defineRouteRaw(
  { route: "GET /api/leaderboard", auth: "none" },
  async ({ request }) => {
    const methodCheck = allowMethods(request, ["GET"]);
    if (methodCheck) return methodCheck;

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

    return Response.json({
      leaderboard,
      userRank: null,
      totalUsers: result.totalUsers,
    });
  },
);
