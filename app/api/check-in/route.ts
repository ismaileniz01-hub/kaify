import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
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
export const POST = defineRoute(
  { route: "POST /api/check-in", rateLimit: "checkin" },
  async ({ user, request }) => {
    const requestKey = getOptionalIdempotencyKey(request);
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/check-in",
      key: requestKey,
      requestBody: null,
      handler: () => performCheckIn(user.id, requestKey),
    });
  },
);
