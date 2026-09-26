import { defineRoute } from "@/lib/api/route-handler";
import {
  claimReferralSkinReward,
  getReferralSkinClaimStatus,
} from "@/lib/services/referral.service";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** GET /api/referral/claim — whether Thunder redeem (Al) is available. */
export const GET = defineRoute(
  { route: "GET /api/referral/claim", auth: "user" },
  async ({ user }) => getReferralSkinClaimStatus(user.id),
);

/** POST /api/referral/claim — invitee claims Thunder skin and equips it. */
export const POST = defineRoute(
  { route: "POST /api/referral/claim", auth: "user", rateLimit: "referral" },
  async ({ user, request }) => {
    const clientKey = getOptionalIdempotencyKey(request as NextRequest);
    const idempotencyKey = clientKey ?? `referral-claim:${user.id}:thunder`;

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/referral/claim",
      key: idempotencyKey,
      requestBody: { skinId: "thunder" },
      handler: () => claimReferralSkinReward(user.id),
    });
  },
);
