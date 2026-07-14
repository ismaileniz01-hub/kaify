import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { patchAnalyticsDaily, addMealToAnalytics } from "@/lib/services/analytics.service";
import { invalidateHomeBundleCache } from "@/lib/cache/invalidate";
import type { Json } from "@/lib/types/database.types";

export type PendingAnalyticsPayload = {
  summary: string;
  patch?: Record<string, number>;
  meal?: { calories: number; protein: number; carbs: number; fat: number };
};

export async function createPendingAnalyticsConfirmation(params: {
  userId: string;
  coachId: string;
  source: "chat" | "photo";
  payload: PendingAnalyticsPayload;
  messageId?: string | null;
}): Promise<string> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data, error } = await admin
    .from("analytics_pending_confirmations")
    .insert({
      user_id: params.userId,
      coach_id: params.coachId,
      source: params.source,
      payload: params.payload as unknown as Json,
      message_id: params.messageId ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new ApiError("INTERNAL_ERROR", "Onay kaydı oluşturulamadı.");
  }
  return data.id;
}

export async function confirmPendingAnalytics(
  userId: string,
  pendingId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;

  // Atomic claim: only one concurrent confirm wins.
  const { data: claimed, error } = await admin
    .from("analytics_pending_confirmations")
    .update({
      status: "confirmed",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", pendingId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay uygulanamadı.");
  }
  if (!claimed) {
    throw new ApiError("NOT_FOUND", "Onay bekleyen kayıt bulunamadı.");
  }

  const payload = claimed.payload as PendingAnalyticsPayload;

  try {
    // Prefer additive meal path. Never SET then ADD the same macros.
    if (payload.meal) {
      await addMealToAnalytics(userId, payload.meal);
    } else if (payload.patch && Object.keys(payload.patch).length > 0) {
      await patchAnalyticsDaily(userId, payload.patch);
    }
  } catch (applyError) {
    // Allow a later retry if side effects failed after the claim.
    await admin
      .from("analytics_pending_confirmations")
      .update({ status: "pending", resolved_at: null })
      .eq("id", pendingId)
      .eq("user_id", userId);
    throw applyError;
  }

  void invalidateHomeBundleCache(userId).catch(() => undefined);
}

export async function rejectPendingAnalytics(
  userId: string,
  pendingId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { error } = await admin
    .from("analytics_pending_confirmations")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", pendingId)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay reddedilemedi.");
  }
}
