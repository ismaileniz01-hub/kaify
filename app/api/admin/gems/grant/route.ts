import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { earnGems } from "@/lib/services/gem.service";
import { recordAdminAction } from "@/lib/services/audit.service";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1).max(100_000),
  reason: z.string().trim().min(1).max(200).optional(),
});

/** POST /api/admin/gems/grant — credit gems to a user (admin gift). */
export const POST = defineRoute(
  { route: "POST /api/admin/gems/grant", auth: "admin" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz hediye.", parsed.error.issues);
    }

    const admin = createAdminSupabaseClient();
    const { data: target } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", parsed.data.userId)
      .maybeSingle();

    if (!target) {
      throw new ApiError("NOT_FOUND", "Kullanıcı bulunamadı.");
    }

    const reason = parsed.data.reason?.trim() || "Admin hediyesi";
    const idempotencyKey = `admin_grant:${user.id}:${parsed.data.userId}:${Date.now()}`;

    const result = await earnGems({
      userId: parsed.data.userId,
      amount: parsed.data.amount,
      type: "admin_adjustment",
      description: reason,
      idempotencyKey,
      metadata: { grantedBy: user.id },
    });

    await recordAdminAction({
      adminId: user.id,
      action: "gems.grant",
      targetType: "user",
      targetId: parsed.data.userId,
      metadata: {
        amount: parsed.data.amount,
        reason,
        balance: result.balance,
      },
      ip: getClientIP(request),
    });

    return {
      userId: parsed.data.userId,
      amount: parsed.data.amount,
      balance: result.balance,
    };
  },
);
