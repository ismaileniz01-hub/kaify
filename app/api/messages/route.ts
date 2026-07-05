import { defineRoute } from "@/lib/api/route-handler";
import { getInbox } from "@/lib/services/messages.service";

export const dynamic = "force-dynamic";

/** GET /api/messages — inbox previews per coach. */
export const GET = defineRoute(
  { route: "GET /api/messages" },
  async () => {
    const inbox = await getInbox();
    return { inbox };
  },
);
