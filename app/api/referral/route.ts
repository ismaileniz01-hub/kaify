import { NextRequest } from "next/server";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import {
  getReferralSummary,
  trackReferral,
} from "@/lib/services/referral.service";
import { trackReferralSchema } from "@/lib/validations/referral.schema";

export const runtime = "nodejs";

/** GET /api/referral — the user's referral code + stats. */
export const GET = defineRoute(
  { route: "GET /api/referral" },
  async ({ user }) => getReferralSummary(user.id),
);

/** POST /api/referral — record a referral for the current user (post-signup). */
export const POST = defineRoute(
  { route: "POST /api/referral", rateLimit: "referral" },
  async ({ user, request }) => {
    const body = await request.json().catch(() => null);
    const parsed = trackReferralSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz referans kodu.", parsed.error.issues);
    }

    const clientKey = getOptionalIdempotencyKey(request as NextRequest);
    const idempotencyKey =
      clientKey ?? `referral:${user.id}:${parsed.data.code.trim().toUpperCase()}`;

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/referral",
      key: idempotencyKey,
      requestBody: parsed.data,
      handler: () =>
        trackReferral({
          referredId: user.id,
          code: parsed.data.code,
        }),
    });
  },
);
