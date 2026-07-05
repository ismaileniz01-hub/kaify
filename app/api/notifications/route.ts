import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/services/notifications.service";

export const dynamic = "force-dynamic";

/** GET /api/notifications — recent notifications + unread count. */
export const GET = defineRoute(
  { route: "GET /api/notifications" },
  async () => listNotifications(),
);

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
});

/**
 * PATCH /api/notifications — mark notifications read.
 * Body `{ ids: [...] }` marks specific ones; empty/omitted marks all as read.
 */
export const PATCH = defineRoute(
  { route: "PATCH /api/notifications" },
  async ({ request }) => {
    const raw = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz istek.", parsed.error.issues);
    }

    const updated = await markNotificationsRead(parsed.data.ids);
    return { updated };
  },
);
