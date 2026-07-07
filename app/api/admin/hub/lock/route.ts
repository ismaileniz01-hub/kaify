import { cookies } from "next/headers";
import { defineRoute } from "@/lib/api/route-handler";
import { requireAdminRole } from "@/lib/api/admin-role";
import { ADMIN_HUB_COOKIE_NAME } from "@/lib/auth/admin-hub-session";

/** POST /api/admin/hub/lock — clear hub session (require password on next entry). */
export const POST = defineRoute(
  { route: "POST /api/admin/hub/lock", auth: "user" },
  async () => {
    await requireAdminRole();
    const jar = await cookies();
    jar.delete(ADMIN_HUB_COOKIE_NAME);
    return { locked: true };
  },
);
