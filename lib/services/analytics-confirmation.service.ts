import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { writeConfirmAnalyticsPending } from "@/lib/repositories/analytics-write.repository";
import { invalidateHomeBundleCache } from "@/lib/cache/invalidate";
import { emitKaiosEventBestEffort } from "@/lib/kaios/events";
import type { Json } from "@/lib/types/database.types";

/** Pending meal/analytics confirmations expire after 24h (application-enforced). */
export const PENDING_ANALYTICS_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingAnalyticsPayload = {
  summary: string;
  patch?: Record<string, number>;
  meal?: { calories: number; protein: number; carbs: number; fat: number };
};

type PendingRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  payload: Json;
  source: string;
  coach_id: string;
};

function isExpired(createdAt: string, now = Date.now()): boolean {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return true;
  return now - t > PENDING_ANALYTICS_TTL_MS;
}

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

/** Bind a pending confirmation to the chat message that displays it. */
export async function linkPendingConfirmationToMessage(params: {
  userId: string;
  pendingId: string;
  messageId: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  await admin
    .from("analytics_pending_confirmations")
    .update({ message_id: params.messageId })
    .eq("id", params.pendingId)
    .eq("user_id", params.userId)
    .eq("status", "pending");
}

async function loadOwnedPending(
  userId: string,
  pendingId: string,
): Promise<PendingRow | null> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data, error } = await admin
    .from("analytics_pending_confirmations")
    .select("id, user_id, status, created_at, payload, source, coach_id")
    .eq("id", pendingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay kaydı okunamadı.");
  }
  return (data as PendingRow | null) ?? null;
}

export async function confirmPendingAnalytics(
  userId: string,
  pendingId: string,
): Promise<void> {
  const row = await loadOwnedPending(userId, pendingId);
  if (!row) {
    throw new ApiError("NOT_FOUND", "Onay kaydı bulunamadı.");
  }
  if (row.status !== "pending") {
    // Idempotent: already confirmed/applying/rejected — do not double-apply.
    if (row.status === "confirmed") return;
    throw new ApiError("CONFLICT", "Onay kaydı artık bekleyen durumda değil.");
  }
  if (isExpired(row.created_at)) {
    await rejectPendingAnalytics(userId, pendingId, "expired");
    throw new ApiError(
      "CONFLICT",
      "Onay süresi doldu. Lütfen analizi tekrar oluştur.",
    );
  }

  await writeConfirmAnalyticsPending(userId, pendingId);
  void invalidateHomeBundleCache(userId).catch(() => undefined);

  const payload = (row.payload ?? {}) as PendingAnalyticsPayload;
  if (payload.meal) {
    // Meal is already durable via RPC — event/memory must not gate success.
    await emitKaiosEventBestEffort({
      category: "nutrition",
      type: "meal_saved",
      userId,
      payload: { meal: payload.meal, pendingId, source: row.source },
      at: new Date().toISOString(),
    });
  }
}

export async function rejectPendingAnalytics(
  userId: string,
  pendingId: string,
  reason: "user" | "expired" = "user",
): Promise<{ alreadyResolved: boolean }> {
  const row = await loadOwnedPending(userId, pendingId);
  if (!row) {
    throw new ApiError("NOT_FOUND", "Onay kaydı bulunamadı.");
  }
  if (row.status !== "pending") {
    return { alreadyResolved: true };
  }

  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data, error } = await admin
    .from("analytics_pending_confirmations")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", pendingId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay reddedilemedi.");
  }
  if (!data) {
    return { alreadyResolved: true };
  }

  await emitKaiosEventBestEffort({
    category: "nutrition",
    type:
      reason === "expired"
        ? "meal_confirmation_expired"
        : "meal_confirmation_rejected",
    userId,
    payload: { pendingId },
    at: new Date().toISOString(),
  });

  return { alreadyResolved: false };
}

/** Exported for tests. */
export function pendingAnalyticsIsExpired(
  createdAt: string,
  now = Date.now(),
): boolean {
  return isExpired(createdAt, now);
}
