import { defineRoute } from "@/lib/api/route-handler";
import { getSessionBundle } from "@/lib/services/session.service";

export const dynamic = "force-dynamic";

/** GET /api/session — authenticated bootstrap bundle (profile, gems, streak, home, kai). */
export const GET = defineRoute(
  { route: "GET /api/session", rateLimit: "checkin" },
  async ({ user }) => getSessionBundle(user.id),
);
