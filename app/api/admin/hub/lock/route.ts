import { defineRoute } from "@/lib/api/route-handler";
import { requireAdminRole } from "@/lib/api/admin-role";
import { clearAdminHubSessionIfNotNewer } from "@/lib/auth/admin-hub-session";

/** POST /api/admin/hub/lock — clear hub session (require password on next entry). */
export const POST = defineRoute(
  { route: "POST /api/admin/hub/lock", auth: "user" },
  async () => {
    const startedAt = Math.floor(Date.now() / 1000);
    await requireAdminRole();
    await clearAdminHubSessionIfNotNewer(startedAt);
    return { locked: true };
  },
);
