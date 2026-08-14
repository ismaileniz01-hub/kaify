import { defineRoute } from "@/lib/api/route-handler";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import {
  getOrCreateUserTicket,
  sendUserSupportMessage,
} from "@/lib/services/support.service";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  { route: "GET /api/support", auth: "user" },
  async ({ user }) => getOrCreateUserTicket(user.id),
);

export const POST = defineRoute(
  { route: "POST /api/support", auth: "user" },
  async ({ user, request }) => {
    const raw = (await request.json().catch(() => null)) as { message?: string } | null;
    const message = typeof raw?.message === "string" ? raw.message : "";
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/support",
      key: getOptionalIdempotencyKey(request),
      requestBody: { message },
      handler: () => sendUserSupportMessage(user.id, message),
    });
  },
);
