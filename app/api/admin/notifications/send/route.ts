import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { recordAdminAction } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";

import { normalizeUserId } from "@/lib/utils/user-id";

const schema = z.object({
  userId: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
});

/** POST /api/admin/notifications/send — in-app + push alert to one user. */
export const POST = defineRoute(
  { route: "POST /api/admin/notifications/send", auth: "admin" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz bildirim.", parsed.error.issues);
    }

    const userId = normalizeUserId(parsed.data.userId);
    if (!userId) {
      throw new ApiError("VALIDATION_ERROR", "Geçerli bir kullanıcı ID girin.");
    }

    const admin = createAdminSupabaseClient();
    const { data: target } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!target) {
      throw new ApiError("NOT_FOUND", "Kullanıcı bulunamadı.");
    }

    await createNotification({
      userId,
      type: "system",
      title: parsed.data.title,
      body: parsed.data.body,
    });

    await recordAdminAction({
      adminId: user.id,
      action: "notifications.send",
      targetType: "user",
      targetId: userId,
      metadata: { title: parsed.data.title },
      ip: getClientIP(request),
    });

    return { sent: true, userId };
  },
);
