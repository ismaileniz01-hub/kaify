import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { recordAdminAction } from "@/lib/services/audit.service";
import { broadcastSystemNotification } from "@/lib/services/notifications.service";

export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  broadcastId: z.string().trim().min(8).max(64).optional(),
});

/** POST /api/admin/notifications/broadcast — in-app + push alert to all users. */
export const POST = defineRoute(
  { route: "POST /api/admin/notifications/broadcast", auth: "admin" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = broadcastSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz bildirim.", parsed.error.issues);
    }

    const result = await broadcastSystemNotification({
      title: parsed.data.title,
      body: parsed.data.body,
      broadcastId: parsed.data.broadcastId,
    });

    await recordAdminAction({
      adminId: user.id,
      action: "notifications.broadcast",
      targetType: "broadcast",
      targetId: result.broadcastId,
      metadata: {
        title: parsed.data.title,
        recipients: result.recipients,
        inserted: result.inserted,
      },
      ip: getClientIP(request),
    });

    return result;
  },
);
