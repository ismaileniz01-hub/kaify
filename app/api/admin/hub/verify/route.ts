import { z } from "zod";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { requireAdminRole } from "@/lib/api/admin-role";
import { getClientIP } from "@/lib/api-security";
import {
  ADMIN_HUB_COOKIE_NAME,
  adminHubCookieOptions,
  mintAdminHubToken,
  verifyAdminHubPassword,
} from "@/lib/auth/admin-hub-session";
import { recordAdminAction } from "@/lib/services/audit.service";

const schema = z.object({
  password: z.string().min(1).max(128),
});

/** POST /api/admin/hub/verify — unlock admin hub with operator password. */
export const POST = defineRoute(
  { route: "POST /api/admin/hub/verify", auth: "user" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz şifre.", parsed.error.issues);
    }

    await requireAdminRole();

    if (!verifyAdminHubPassword(parsed.data.password)) {
      throw new ApiError("FORBIDDEN", "Yanlış şifre.");
    }

    const jar = await cookies();
    jar.set(
      ADMIN_HUB_COOKIE_NAME,
      await mintAdminHubToken(user.id),
      adminHubCookieOptions(),
    );

    await recordAdminAction({
      adminId: user.id,
      action: "admin_hub.unlock",
      targetType: "session",
      targetId: user.id,
      ip: getClientIP(request),
    });

    return { unlocked: true };
  },
);
