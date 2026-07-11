import { defineRoute } from "@/lib/api/route-handler";
import { createCustomerPortalUrl } from "@/lib/services/billing-portal.service";

export const dynamic = "force-dynamic";

/** POST /api/billing/portal — mint Paddle customer portal session for the signed-in user. */
export const POST = defineRoute(
  {
    route: "POST /api/billing/portal",
    auth: "user",
    requireCsrf: true,
  },
  async ({ user }) => {
    const url = await createCustomerPortalUrl(user.id);
    return { url };
  },
);
