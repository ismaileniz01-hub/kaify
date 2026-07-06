import { defineRoute } from "@/lib/api/route-handler";
import { listPendingGiftsForUser } from "@/lib/services/pending-gift.service";

/** GET /api/gifts/pending — unclaimed gifts for the signed-in user. */
export const GET = defineRoute(
  { route: "GET /api/gifts/pending", auth: "user" },
  async () => {
    const items = await listPendingGiftsForUser();
    return { items };
  },
);
