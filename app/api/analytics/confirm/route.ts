import { defineRoute } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import {
  confirmPendingAnalytics,
  rejectPendingAnalytics,
} from "@/lib/services/analytics-confirmation.service";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  { route: "POST /api/analytics/confirm", auth: "user" },
  async ({ user, request }) => {
    const raw = (await request.json().catch(() => null)) as {
      pendingId?: string;
      action?: string;
    } | null;
    const pendingId = typeof raw?.pendingId === "string" ? raw.pendingId : "";
    const action = raw?.action === "reject" ? "reject" : "confirm";

    if (!pendingId) {
      throw new ApiError("VALIDATION_ERROR", "pendingId gerekli.");
    }

    if (action === "reject") {
      await rejectPendingAnalytics(user.id, pendingId);
    } else {
      await confirmPendingAnalytics(user.id, pendingId);
    }

    return { ok: true, action };
  },
);
