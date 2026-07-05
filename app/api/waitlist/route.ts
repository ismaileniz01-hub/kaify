import { waitlistSchema } from "@/lib/api-security";
import { defineRouteRaw } from "@/lib/api/route-handler";
import { handleSenderSubscribe } from "@/lib/marketing/sender";

/**
 * POST /api/waitlist — public Sender.net subscription (shared handler).
 */
export const POST = defineRouteRaw(
  { route: "POST /api/waitlist", auth: "none", publicRateLimit: "waitlist" },
  async ({ request }) =>
    handleSenderSubscribe(request, "api/waitlist", waitlistSchema),
);
