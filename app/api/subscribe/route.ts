import { subscribeSchema } from "@/lib/api-security";
import { defineRouteRaw } from "@/lib/api/route-handler";
import { handleSenderSubscribe } from "@/lib/marketing/sender";

/**
 * POST /api/subscribe — public Sender.net subscription (shared handler).
 */
export const POST = defineRouteRaw(
  { route: "POST /api/subscribe", auth: "none", publicRateLimit: "subscribe" },
  async ({ request }) =>
    handleSenderSubscribe(request, "api/subscribe", subscribeSchema),
);
