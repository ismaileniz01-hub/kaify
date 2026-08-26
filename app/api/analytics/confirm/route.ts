import { defineRoute } from "@/lib/api/route-handler";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import {
  MAX_JSON_BODY_CHAT,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { ApiError } from "@/lib/api/errors";
import {
  confirmPendingAnalytics,
  correctPendingAnalytics,
  rejectPendingAnalytics,
} from "@/lib/services/analytics-confirmation.service";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  { route: "POST /api/analytics/confirm", auth: "user" },
  async ({ user, request }) => {
    const raw = (await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT)) as {
      pendingId?: string;
      action?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    } | null;
    const pendingId = typeof raw?.pendingId === "string" ? raw.pendingId : "";
    const action =
      raw?.action === "reject" || raw?.action === "correct" ? raw.action : "confirm";

    if (!pendingId) {
      throw new ApiError("VALIDATION_ERROR", "pendingId zorunludur.");
    }

    const key = getOptionalIdempotencyKey(request);
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/analytics/confirm",
      key,
      requestBody: { pendingId, action },
      handler: async () => {
        if (action === "reject") {
          await rejectPendingAnalytics(user.id, pendingId);
        } else if (action === "correct") {
          await correctPendingAnalytics(user.id, pendingId, {
            calories: Number(raw?.calories ?? 0),
            protein: Number(raw?.protein ?? 0),
            carbs: Number(raw?.carbs ?? 0),
            fat: Number(raw?.fat ?? 0),
          });
        } else {
          await confirmPendingAnalytics(user.id, pendingId);
        }
        return { ok: true, action };
      },
    });
  },
);
