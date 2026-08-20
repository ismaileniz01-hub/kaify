import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { writeConfirmAnalyticsPending } from "@/lib/repositories/analytics-write.repository";
import { invalidateHomeBundleCache } from "@/lib/cache/invalidate";
import { sanitizeAnalyticsPatch, sanitizeMealMacros } from "@/lib/analytics/bounds";
import { emitKaiosEventBestEffort } from "@/lib/kaios/events";
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

/** Confirm the newest still-open Maya/Alex analytics card (chat "evet"). */
export async function confirmLatestPendingAnalytics(
  userId: string,
): Promise<PendingAnalyticsPayload | null> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data } = await admin
    .from("analytics_pending_confirmations")
    .select("id, payload, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.id) return null;
  if (pendingAnalyticsIsExpired(data.created_at)) return null;
  await confirmPendingAnalytics(userId, data.id);
  const payload =
    data.payload && typeof data.payload === "object"
      ? (data.payload as PendingAnalyticsPayload)
      : null;
  return payload;
}

export async function confirmPendingAnalytics(
  userId: string,
  pendingId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data: pending } = await admin
    .from("analytics_pending_confirmations")
    .select("payload")
    .eq("id", pendingId)
    .eq("user_id", userId)
    .maybeSingle();

  await writeConfirmAnalyticsPending(userId, pendingId);
  void invalidateHomeBundleCache(userId).catch(() => undefined);

  const payload =
    pending?.payload && typeof pending.payload === "object"
      ? (pending.payload as {
          meal?: { calories?: number; protein?: number; carbs?: number; fat?: number };
          patch?: Record<string, number>;
          summary?: string;
        })
      : null;
  if (payload?.meal) {
    await emitKaiosEventBestEffort({
      category: "nutrition",
      type: "meal_saved",
      userId,
      payload: { meal: payload.meal },
      at: new Date().toISOString(),
    });
  }
  const workouts = Number(payload?.patch?.workoutsCompleted ?? payload?.patch?.workouts_completed);
  if (Number.isFinite(workouts) && workouts > 0) {
    await emitKaiosEventBestEffort({
      category: "training",
      type: "workout_completed",
      userId,
      payload: { summary: payload?.summary ?? "workout_completed" },
      at: new Date().toISOString(),
    });
  }
  const water = Number(payload?.patch?.waterLiters ?? payload?.patch?.water_liters);
  if (Number.isFinite(water) && water > 0) {
    await emitKaiosEventBestEffort({
      category: "hydration",
      type: "hydration_recorded",
      userId,
      payload: { liters: water },
      at: new Date().toISOString(),
    });
  }
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
