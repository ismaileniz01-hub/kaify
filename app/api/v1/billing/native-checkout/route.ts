import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { parseJsonWithLimit } from "@/lib/security/body-limit";

const requestSchema = z.object({
  planId: z.enum(["essential", "pro", "premium"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deprecated for store builds — digital subscriptions are website-only (ADR 019).
 * Kept so old clients receive a clear error instead of a Paddle checkout URL.
 */
export const POST = defineRoute(
  {
    route: "POST /api/v1/billing/native-checkout",
    requireTermsConsent: true,
  },
  async ({ request }) => {
    const body = await parseJsonWithLimit(request, 8 * 1024);
    requestSchema.safeParse(body);
    throw new ApiError(
      "FORBIDDEN",
      "Checkout is only available on kaifyai.org. Sign in to the app after you subscribe on the website.",
    );
  },
);
