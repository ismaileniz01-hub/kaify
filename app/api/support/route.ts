import { defineRoute } from "@/lib/api/route-handler";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import {
  MAX_JSON_BODY_CHAT,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { ApiError } from "@/lib/api/errors";
import {
  getUserSupportTicket,
  sendUserSupportMessage,
} from "@/lib/services/support.service";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  { route: "GET /api/support", auth: "user" },
  async ({ user }) => getUserSupportTicket(user.id),
);

export const POST = defineRoute(
  { route: "POST /api/support", auth: "user" },
  async ({ user, request }) => {
    const raw = (await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT)) as {
      message?: string;
    } | null;
    const message = typeof raw?.message === "string" ? raw.message : "";
    if (!message.trim()) {
      throw new ApiError("VALIDATION_ERROR", "Mesaj boş olamaz.");
    }
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/support",
      key: getOptionalIdempotencyKey(request),
      requestBody: { message },
      handler: () => sendUserSupportMessage(user.id, message),
    });
  },
);
