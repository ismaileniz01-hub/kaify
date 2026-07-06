import { defineRoute } from "@/lib/api/route-handler";
import { requireAdminRole } from "@/lib/api/admin-role";
import { verifyAdminHubSession } from "@/lib/auth/admin-hub-session";

/** GET /api/admin/hub/status — whether the hub password gate is unlocked. */
export const GET = defineRoute(
  { route: "GET /api/admin/hub/status", auth: "user" },
  async () => {
    const user = await requireAdminRole();
    const unlocked = await verifyAdminHubSession(user.id);
    return { unlocked };
  },
);
