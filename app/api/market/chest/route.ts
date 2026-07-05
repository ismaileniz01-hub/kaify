import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import {
  claimDailyChest,
  getDailyChestStatus,
} from "@/lib/services/daily-chest.service";

export const dynamic = "force-dynamic";

function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/market/chest — daily chest availability. */
export const GET = defineRoute(
  { route: "GET /api/market/chest" },
  async ({ user }) => getDailyChestStatus(user.id),
);

/** POST /api/market/chest — roll reward and grant (once per UTC day). */
export const POST = defineRoute(
  { route: "POST /api/market/chest", rateLimit: "chest" },
  async ({ user, request }) => {
    const clientKey = getOptionalIdempotencyKey(request);
    const today = utcTodayKey();
    const idempotencyKey = clientKey ?? `chest:${user.id}:${today}`;

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/market/chest",
      key: idempotencyKey,
      requestBody: { utcDate: today },
      handler: () => claimDailyChest(user.id),
    });
  },
);
