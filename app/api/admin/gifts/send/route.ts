import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { recordAdminAction } from "@/lib/services/audit.service";
import { createPendingGift } from "@/lib/services/pending-gift.service";
import { normalizeUserId } from "@/lib/utils/user-id";

const schema = z.object({
  userId: z.string().min(1).max(128),
  rewardKind: z.enum(["gems", "freezie"]),
  amount: z.coerce.number().int().min(1).max(100_000),
  reason: z.string().trim().min(1).max(200).optional(),
});

/** POST /api/admin/gifts/send — queue a claimable gift for a user. */
export const POST = defineRoute(
  { route: "POST /api/admin/gifts/send", auth: "admin" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz hediye.", parsed.error.issues);
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

    const reason = parsed.data.reason?.trim() || "Admin hediyesi";
    const gift = await createPendingGift({
      userId,
      rewardKind: parsed.data.rewardKind,
      amount: parsed.data.amount,
      reason,
      grantedBy: user.id,
    });

    await recordAdminAction({
      adminId: user.id,
      action: "gifts.send",
      targetType: "user",
      targetId: userId,
      metadata: {
        giftId: gift.id,
        rewardKind: parsed.data.rewardKind,
        amount: parsed.data.amount,
        reason,
      },
      ip: getClientIP(request),
    });

    return {
      giftId: gift.id,
      userId,
      rewardKind: gift.rewardKind,
      amount: gift.amount,
      pending: true,
    };
  },
);
