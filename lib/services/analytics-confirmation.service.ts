import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { writeConfirmAnalyticsPending } from "@/lib/repositories/analytics-write.repository";
import { invalidateHomeBundleCache } from "@/lib/cache/invalidate";
import { sanitizeAnalyticsPatch, sanitizeMealMacros } from "@/lib/analytics/bounds";
import type { Json } from "@/lib/types/database.types";

/** Pending meal/analytics confirmations expire after 24h (application-enforced). */
export const PENDING_ANALYTICS_TTL_MS = 24 * 60 * 60 * 1000;

export function pendingAnalyticsIsExpired(
  createdAt: string,
  now = Date.now(),
): boolean {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return true;
  return now - t > PENDING_ANALYTICS_TTL_MS;
}

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
  sourceMessageId?: string | null;
}): Promise<string> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const payload: PendingAnalyticsPayload = {
    summary: params.payload.summary,
    patch: params.payload.patch
      ? (sanitizeAnalyticsPatch(params.payload.patch) as Record<string, number>)
      : undefined,
    meal: params.payload.meal
      ? sanitizeMealMacros(params.payload.meal)
      : undefined,
  };
  const { data, error } = await admin
    .from("analytics_pending_confirmations")
    .insert({
      user_id: params.userId,
      coach_id: params.coachId,
      source: params.source,
      payload: payload as unknown as Json,
      message_id: params.messageId ?? null,
      source_message_id: params.sourceMessageId ?? null,
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
  await writeConfirmAnalyticsPending(userId, pendingId);
  void invalidateHomeBundleCache(userId).catch(() => undefined);
}

export async function rejectPendingAnalytics(
  userId: string,
  pendingId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data, error } = await admin
    .from("analytics_pending_confirmations")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", pendingId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay reddedilemedi.");
  }
  if (!data || data.length === 0) {
    throw new ApiError("NOT_FOUND", "Onay bekleyen kayıt bulunamadı.");
  }
}

export async function linkPendingConfirmationToMessage(params: {
  userId: string;
  pendingId: string;
  messageId: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data, error } = await admin
    .from("analytics_pending_confirmations")
    .update({ message_id: params.messageId, source_message_id: params.messageId })
    .eq("id", params.pendingId)
    .eq("user_id", params.userId)
    .select("id");

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay kaydı bağlanamadı.");
  }
  void data;
}
