import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { handleApiError, ok } from "@/lib/api/response";
import {
  claimDailyChest,
  getDailyChestStatus,
} from "@/lib/services/daily-chest.service";

export const dynamic = "force-dynamic";

function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/market/chest — daily chest availability. */
export async function GET() {
  try {
    const user = await requireUser();
    const status = await getDailyChestStatus(user.id);
    return ok(status);
  } catch (error) {
    return handleApiError(error, { route: "/api/market/chest" });
  }
}

/** POST /api/market/chest — roll reward and grant (once per UTC day). */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    await enforceUserRateLimit(user.id, "chest");

    const clientKey = getOptionalIdempotencyKey(request);
    const today = utcTodayKey();
    const idempotencyKey = clientKey ?? `chest:${user.id}:${today}`;

    const result = await withIdempotency({
      userId: user.id,
      endpoint: "POST /api/market/chest",
      key: idempotencyKey,
      requestBody: { utcDate: today },
      handler: () => claimDailyChest(user.id),
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/market/chest" });
  }
}
