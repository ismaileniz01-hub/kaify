import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/services/notifications.service";

export const dynamic = "force-dynamic";

/** GET /api/notifications — recent notifications + unread count. */
export async function GET() {
  try {
    await requireUser();
    const result = await listNotifications();
    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/notifications" });
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
});

/**
 * PATCH /api/notifications — mark notifications read.
 * Body `{ ids: [...] }` marks specific ones; empty/omitted marks all as read.
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireUser();

    const raw = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz istek.", parsed.error.issues);
    }

    const updated = await markNotificationsRead(parsed.data.ids);
    return ok({ updated });
  } catch (error) {
    return handleApiError(error, { route: "/api/notifications" });
  }
}
