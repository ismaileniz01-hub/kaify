import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { writeConfirmAnalyticsPending } from "@/lib/repositories/analytics-write.repository";
import { invalidateHomeBundleCache, invalidateUserReadCaches } from "@/lib/cache/invalidate";
import { sanitizeAnalyticsPatch, sanitizeMealMacros } from "@/lib/analytics/bounds";
import { patchAnalyticsDaily } from "@/lib/services/analytics.service";
import { emitKaiosEventBestEffort } from "@/lib/kaios/events";
import { mergeConfirmationStamp } from "@/lib/analytics/confirmation-payload";
import { emitProductEvent, emitFirstActivation, productEventIdempotencyKey } from "@/lib/events/product";
import { logger } from "@/lib/logger";
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
  emitProductEvent({
    name: "scan.result_shown",
    userId: params.userId,
    properties: {
      scan_type: payload.meal ? "meal" : "analytics",
      confidence_bucket: "pending",
      model: params.source,
    },
    idempotencyKey: productEventIdempotencyKey([
      "scan.result_shown",
      params.userId,
      data.id,
    ]),
  });
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

async function stampConfirmationOnChatMessages(params: {
  admin: SupabaseClient;
  userId: string;
  pendingId: string;
  status: "confirmed" | "rejected";
  messageId?: string | null;
  sourceMessageId?: string | null;
}): Promise<void> {
  try {
    const ids = new Set<string>();
    if (params.messageId) ids.add(params.messageId);
    if (params.sourceMessageId) ids.add(params.sourceMessageId);

    const stampRow = async (messageId: string, payload: unknown) => {
      const next = mergeConfirmationStamp(payload, params.status);
      await params.admin
        .from("chat_messages")
        .update({ payload: next as Json })
        .eq("id", messageId)
        .eq("user_id", params.userId);
    };

    if (ids.size > 0) {
      const { data: rows } = await params.admin
        .from("chat_messages")
        .select("id, payload")
        .eq("user_id", params.userId)
        .in("id", [...ids]);
      for (const row of rows ?? []) {
        if (row?.id) await stampRow(String(row.id), row.payload);
      }
      if ((rows?.length ?? 0) > 0) return;
    }

    const { data: matched } = await params.admin
      .from("chat_messages")
      .select("id, payload")
      .eq("user_id", params.userId)
      .eq("payload->confirmation->>pendingId", params.pendingId)
      .limit(8);
    for (const row of matched ?? []) {
      if (row?.id) await stampRow(String(row.id), row.payload);
    }
  } catch (error) {
    logger.warn("[analytics-confirmation] failed to stamp chat payload", {
      pendingId: params.pendingId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function confirmPendingAnalytics(
  userId: string,
  pendingId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data: pending } = await admin
    .from("analytics_pending_confirmations")
    .select("payload, message_id, source_message_id, status")
    .eq("id", pendingId)
    .eq("user_id", userId)
    .maybeSingle();

  const alreadyResolved =
    pending?.status === "confirmed" || pending?.status === "rejected"
      ? (pending.status as "confirmed" | "rejected")
      : null;
  if (alreadyResolved) {
    await stampConfirmationOnChatMessages({
      admin,
      userId,
      pendingId,
      status: alreadyResolved,
      messageId: pending?.message_id,
      sourceMessageId: pending?.source_message_id,
    });
    return;
  }

  await writeConfirmAnalyticsPending(userId, pendingId);
  await stampConfirmationOnChatMessages({
    admin,
    userId,
    pendingId,
    status: "confirmed",
    messageId: pending?.message_id,
    sourceMessageId: pending?.source_message_id,
  });
  void Promise.all([
    invalidateUserReadCaches(userId),
    invalidateHomeBundleCache(userId),
  ]).catch(() => undefined);

  const payload =
    pending?.payload && typeof pending.payload === "object"
      ? (pending.payload as {
          meal?: { calories?: number; protein?: number; carbs?: number; fat?: number };
          patch?: Record<string, number>;
          summary?: string;
        })
      : null;
  if (payload?.meal && payload.patch) {
    const extras: Record<string, number> = {};
    const water = Number(payload.patch.waterLiters ?? payload.patch.water_liters);
    if (Number.isFinite(water) && water > 0) extras.waterLiters = water;
    if (Object.keys(extras).length > 0) {
      try {
        await patchAnalyticsDaily(userId, extras);
      } catch {
        // Meal already landed; water can be retried from a later log.
      }
    }
  }
  if (payload?.meal) {
    await emitKaiosEventBestEffort({
      category: "nutrition",
      type: "meal_saved",
      userId,
      payload: { meal: payload.meal },
      at: new Date().toISOString(),
    });
    emitProductEvent({
      name: "activation.first_meal_logged",
      userId,
      properties: { action: "meal", first: true },
      idempotencyKey: productEventIdempotencyKey([
        "activation.first_meal_logged",
        userId,
      ]),
    });
    emitFirstActivation("activation.first_scan_confirmed", userId, "scan");
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
    .select("id, message_id, source_message_id");

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay reddedilemedi.");
  }
  if (!data || data.length === 0) {
    const { data: existing } = await admin
      .from("analytics_pending_confirmations")
      .select("status, message_id, source_message_id")
      .eq("id", pendingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.status === "confirmed" || existing?.status === "rejected") {
      await stampConfirmationOnChatMessages({
        admin,
        userId,
        pendingId,
        status: existing.status,
        messageId: existing.message_id,
        sourceMessageId: existing.source_message_id,
      });
      return;
    }
    throw new ApiError("NOT_FOUND", "Onay bekleyen kayıt bulunamadı.");
  }
  await stampConfirmationOnChatMessages({
    admin,
    userId,
    pendingId,
    status: "rejected",
    messageId: data[0]?.message_id,
    sourceMessageId: data[0]?.source_message_id,
  });
  emitProductEvent({
    name: "scan.rejected",
    userId,
    properties: { scan_type: "meal", action: "reject" },
    idempotencyKey: productEventIdempotencyKey(["scan.rejected", userId, pendingId]),
  });
  await recordScanCorrection({
    userId,
    pendingId,
    action: "reject",
  });
}

export async function correctPendingAnalytics(
  userId: string,
  pendingId: string,
  macros: { calories: number; protein: number; carbs: number; fat: number },
): Promise<void> {
  const admin = createAdminSupabaseClient() as SupabaseClient;
  const { data: pending } = await admin
    .from("analytics_pending_confirmations")
    .select("payload")
    .eq("id", pendingId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (!pending) {
    throw new ApiError("NOT_FOUND", "Onay bekleyen kayıt bulunamadı.");
  }
  const current =
    pending.payload && typeof pending.payload === "object"
      ? (pending.payload as PendingAnalyticsPayload)
      : { summary: "corrected meal" };
  const meal = sanitizeMealMacros(macros);
  await admin
    .from("analytics_pending_confirmations")
    .update({
      payload: {
        ...current,
        meal,
        patch: { caloriesConsumed: meal.calories },
      } as unknown as Json,
    })
    .eq("id", pendingId)
    .eq("user_id", userId);
  await recordScanCorrection({
    userId,
    pendingId,
    action: "correct",
    meal,
  });
  emitProductEvent({
    name: "scan.corrected",
    userId,
    properties: { scan_type: "meal", action: "correct" },
    idempotencyKey: productEventIdempotencyKey(["scan.corrected", userId, pendingId]),
  });
  await confirmPendingAnalytics(userId, pendingId);
}

async function recordScanCorrection(params: {
  userId: string;
  pendingId: string;
  action: "confirm" | "reject" | "correct";
  meal?: { calories: number; protein: number; carbs: number; fat: number };
}): Promise<void> {
  const admin = createAdminSupabaseClient() as unknown as SupabaseClient;
  await admin.from("scan_corrections").insert({
    user_id: params.userId,
    pending_id: params.pendingId,
    scan_type: "meal",
    action: params.action,
    calories: params.meal?.calories ?? null,
    protein: params.meal?.protein ?? null,
    carbs: params.meal?.carbs ?? null,
    fat: params.meal?.fat ?? null,
  });
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
