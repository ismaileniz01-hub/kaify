import { defineRoute } from "@/lib/api/route-handler";
import { getSubscriptionLifecycle } from "@/lib/services/billing-lifecycle.service";

export const dynamic = "force-dynamic";

/** GET /api/billing/status — Paddle mirror + entitlement for account UI. */
export const GET = defineRoute(
  { route: "GET /api/billing/status" },
  async ({ user }) => getSubscriptionLifecycle(user.id),
);
