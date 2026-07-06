import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { claimPendingGift } from "@/lib/services/pending-gift.service";

const schema = z.object({
  giftId: z.string().uuid(),
});

/** POST /api/gifts/claim — claim a pending admin gift. */
export const POST = defineRoute(
  { route: "POST /api/gifts/claim", auth: "user" },
  async ({ request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz hediye.", parsed.error.issues);
    }

    return claimPendingGift(parsed.data.giftId);
  },
);
