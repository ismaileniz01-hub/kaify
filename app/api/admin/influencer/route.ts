import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { recordAdminAction } from "@/lib/services/audit.service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z.string().trim().min(4).max(20),
  influencerName: z.string().trim().min(1).max(80),
  discountPct: z.number().min(1).max(100).default(10),
  commissionPct: z.number().min(0).max(100).default(10),
});

/** POST /api/admin/influencer — create influencer coupon code */
export const POST = defineRoute(
  { route: "POST /api/admin/influencer", auth: "admin" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz kupon.", parsed.error.issues);
    }

    const code = parsed.data.code.toUpperCase();
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("influencer_codes")
      .insert({
        code,
        influencer_name: parsed.data.influencerName,
        discount_pct: parsed.data.discountPct,
        commission_pct: parsed.data.commissionPct,
      })
      .select("*")
      .single();

    if (error) {
      throw new ApiError("CONFLICT", "Kupon kodu oluşturulamadı.");
    }

    await recordAdminAction({
      adminId: user.id,
      action: "influencer_code.create",
      targetType: "influencer_code",
      targetId: code,
      metadata: {
        influencerName: parsed.data.influencerName,
        discountPct: parsed.data.discountPct,
        commissionPct: parsed.data.commissionPct,
      },
      ip: getClientIP(request),
    });

    return data;
  },
);

/** GET /api/admin/influencer — list influencer codes */
export const GET = defineRoute(
  { route: "GET /api/admin/influencer", auth: "admin" },
  async ({ user, request }) => {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("influencer_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError("INTERNAL_ERROR", "Kuponlar alınamadı.");
    }

    await recordAdminAction({
      adminId: user.id,
      action: "influencer_code.list",
      ip: getClientIP(request),
    });

    return data ?? [];
  },
);
