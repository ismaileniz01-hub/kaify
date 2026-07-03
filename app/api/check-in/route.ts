import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { performCheckIn } from "@/lib/services/streak.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/check-in
 * Records the daily check-in: +1 streak, +10 gems (once per day), Freezie
 * accrual every 7 consecutive days, graded streak-drop protection, and Kai
 * level unlocks. Never blocked by usage limits.
 *
 * Accepts an optional `Idempotency-Key` header (response replay on retry);
 * daily de-duplication is additionally enforced server-side by the user's
 * local date.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    await enforceUserRateLimit(user.id, "checkin");
    const requestKey = getOptionalIdempotencyKey(request);
    const result = await withIdempotency({
      userId: user.id,
      endpoint: "POST /api/check-in",
      key: requestKey,
      requestBody: null,
      handler: () => performCheckIn(user.id, requestKey),
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/check-in" });
  }
}
