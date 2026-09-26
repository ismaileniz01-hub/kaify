import { defineRoute } from "@/lib/api/route-handler";
import { getCountryLeaderboard } from "@/lib/services/leaderboard.service";

export const runtime = "nodejs";

/** GET /api/public/leaderboard/country — marketing country ranks, no user PII. */
export const GET = defineRoute(
  {
    route: "GET /api/public/leaderboard/country",
    auth: "none",
    publicRateLimit: "public_media",
  },
  async () => getCountryLeaderboard({ limit: 5 }),
);
