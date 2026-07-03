import { NextRequest } from "next/server";
import { allowMethods, apiError, leaderboardQuerySchema } from "@/lib/api-security";
import { handleApiError } from "@/lib/api/response";
import { getPublicCountryLeaderboard } from "@/lib/services/leaderboard.service";

export const dynamic = "force-dynamic";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** GET /api/country-leaderboard — public country ranking (legacy shape). */
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

    const result = await getPublicCountryLeaderboard({ limit: 100 });

    const leaderboard = result.leaderboard.map((entry) => ({
      countryCode: entry.countryCode,
      countryName: countryName(entry.countryCode),
      flagCode: entry.flagCode,
      totalStreak: entry.totalStreak,
      userCount: entry.userCount,
    }));

    return Response.json({
      leaderboard,
      userCountry: null,
      userCountryRank: null,
      totalCountries: leaderboard.length,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/country-leaderboard" });
  }
}
