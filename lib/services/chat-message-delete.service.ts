import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { invalidateUserReadCaches } from "@/lib/cache/invalidate";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/types/database.types";

type PendingRow = {
  id: string;
  payload: Json;
  status: string;
  message_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type DeleteChatMessageResult = {
  deletedIds: string[];
  deletedPendingIds: string[];
  rolledBackPendingIds: string[];
  clearedMemoryCount: number;
};

function localDateForTimestamp(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

async function rollbackAnalyticsPayload(params: {
  userId: string;
  payload: Json;
  entryDate: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const payload =
    params.payload && typeof params.payload === "object" && !Array.isArray(params.payload)
      ? (params.payload as Record<string, unknown>)
      : {};
  const meal =
    payload.meal && typeof payload.meal === "object" && !Array.isArray(payload.meal)
      ? numericRecord(payload.meal)
      : null;
  const patch =
    payload.patch && typeof payload.patch === "object" && !Array.isArray(payload.patch)
      ? numericRecord(payload.patch)
      : null;

  const { data: row, error } = await admin
    .from("analytics_daily")
    .select(
      "calories_consumed, calories_burned, workouts_completed, water_liters, protein_g, carbs_g, fat_g",
    )
    .eq("user_id", params.userId)
    .eq("entry_date", params.entryDate)
    .maybeSingle();
  if (error) {
    logger.warn("[chat-delete] analytics rollback read failed", { error: error.message });
    return;
  }
  if (!row) return;

  const next = {
    calories_consumed: Math.max(
      0,
      Number(row.calories_consumed ?? 0) -
        Number(meal?.calories ?? patch?.caloriesConsumed ?? patch?.calories_consumed ?? 0),
    ),
    calories_burned: Math.max(
      0,
      Number(row.calories_burned ?? 0) -
        Number(patch?.caloriesBurned ?? patch?.calories_burned ?? 0),
    ),
    workouts_completed: Math.max(
      0,
      Number(row.workouts_completed ?? 0) -
        Number(patch?.workoutsCompleted ?? patch?.workouts_completed ?? 0),
    ),
    water_liters: Math.max(
      0,
      Number(row.water_liters ?? 0) -
        Number(patch?.waterLiters ?? patch?.water_liters ?? 0),
    ),
    protein_g: Math.max(
      0,
      Number(row.protein_g ?? 0) -
        Number(meal?.protein ?? patch?.proteinG ?? patch?.protein_g ?? 0),
    ),
    carbs_g: Math.max(
      0,
      Number(row.carbs_g ?? 0) -
        Number(meal?.carbs ?? patch?.carbsG ?? patch?.carbs_g ?? 0),
    ),
    fat_g: Math.max(
      0,
      Number(row.fat_g ?? 0) -
        Number(meal?.fat ?? patch?.fatG ?? patch?.fat_g ?? 0),
    ),
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await admin
    .from("analytics_daily")
    .update(next)
    .eq("user_id", params.userId)
    .eq("entry_date", params.entryDate);
  if (updateError) {
    logger.warn("[chat-delete] analytics rollback update failed", {
      error: updateError.message,
    });
  }
}

const MAX_DELETE_IDS = 50;

export async function deleteChatMessage(params: {
  userId: string;
  messageId: string;
  extraIds?: string[];
}): Promise<DeleteChatMessageResult> {
  return deleteChatMessages({
    userId: params.userId,
    messageIds: [params.messageId, ...(params.extraIds ?? [])],
  });
}

export async function deleteChatMessages(params: {
  userId: string;
  messageIds: string[];
}): Promise<DeleteChatMessageResult> {
  const requested = [
    ...new Set(
      params.messageIds.filter((id) => typeof id === "string" && id.trim().length > 0),
    ),
  ];
  if (requested.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Silinecek mesaj seçilmedi.");
  }
  if (requested.length > MAX_DELETE_IDS) {
    throw new ApiError("VALIDATION_ERROR", "Bir seferde çok fazla mesaj seçildi.");
  }

  const admin = createAdminSupabaseClient();
  const pendingAdmin = admin as unknown as {
    from: (table: "analytics_pending_confirmations") => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          in: (
            column: string,
            values: string[],
          ) => Promise<{
            data: PendingRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
      delete: () => {
        eq: (column: string, value: string) => {
          in: (
            column: string,
            values: string[],
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };
  const { data: owned, error: ownedError } = await admin
    .from("chat_messages")
    .select("id")
    .eq("user_id", params.userId)
    .eq("thread_type", "direct")
    .in("id", requested);
  if (ownedError) {
    throw new ApiError("INTERNAL_ERROR", "Mesaj silme bilgisi okunamadı.");
  }

  const impactIds = (owned ?? []).map((row) => row.id);
  if (impactIds.length === 0) {
    throw new ApiError("NOT_FOUND", "Silinecek mesaj bulunamadı.");
  }

  const { error: unlinkError } = await admin
    .from("chat_messages")
    .update({ reply_to_message_id: null })
    .eq("user_id", params.userId)
    .in("reply_to_message_id", impactIds);
  if (unlinkError) {
    logger.warn("[chat-delete] reply unlink failed", { error: unlinkError.message });
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", params.userId)
    .maybeSingle();
  const timezone =
    typeof profile?.timezone === "string" && profile.timezone.trim()
      ? profile.timezone
      : "UTC";

  const { data: pendingByMessage, error: pendingError } = await pendingAdmin
    .from("analytics_pending_confirmations")
    .select("id, payload, status, message_id, created_at, resolved_at, source_message_id")
    .eq("user_id", params.userId)
    .in("message_id", impactIds);
  if (pendingError) {
    throw new ApiError("INTERNAL_ERROR", "Bağlı analytics kayıtları okunamadı.");
  }
  const { data: pendingBySource, error: pendingSourceError } = await pendingAdmin
    .from("analytics_pending_confirmations")
    .select("id, payload, status, message_id, created_at, resolved_at, source_message_id")
    .eq("user_id", params.userId)
    .in("source_message_id", impactIds);
  if (pendingSourceError) {
    throw new ApiError("INTERNAL_ERROR", "Bağlı analytics kaynakları okunamadı.");
  }
  const pendingRows = [
    ...new Map(
      [...(pendingByMessage ?? []), ...(pendingBySource ?? [])].map((row: PendingRow) => [
        row.id,
        row,
      ]),
    ).values(),
  ];

  const deletedPendingIds: string[] = [];
  const rolledBackPendingIds: string[] = [];
  for (const row of pendingRows as PendingRow[]) {
    if (row.status === "confirmed" || row.status === "applying") {
      const effectAt = row.resolved_at ?? row.created_at;
      await rollbackAnalyticsPayload({
        userId: params.userId,
        payload: row.payload,
        entryDate: localDateForTimestamp(effectAt, timezone),
      });
      rolledBackPendingIds.push(row.id);
    }
    deletedPendingIds.push(row.id);
  }

  if (deletedPendingIds.length > 0) {
    const { error } = await pendingAdmin
      .from("analytics_pending_confirmations")
      .delete()
      .eq("user_id", params.userId)
      .in("id", deletedPendingIds);
    if (error) {
      throw new ApiError("INTERNAL_ERROR", "Bağlı analytics kayıtları silinemedi.");
    }
  }

  const { data: memoryDeleted, error: memoryError } = await admin
    .from("coaching_memory")
    .delete()
    .eq("user_id", params.userId)
    .select("id");
  if (memoryError) {
    throw new ApiError("INTERNAL_ERROR", "Koç hafızası temizlenemedi.");
  }

  const { data: deletedRows, error: deleteError } = await admin
    .from("chat_messages")
    .delete()
    .eq("user_id", params.userId)
    .in("id", impactIds)
    .select("id");
  if (deleteError) {
    logger.error("[chat-delete] message delete failed", { error: deleteError.message });
    throw new ApiError("INTERNAL_ERROR", "Mesaj silinemedi.");
  }
  if (!deletedRows || deletedRows.length === 0) {
    throw new ApiError("NOT_FOUND", "Silinecek mesaj bulunamadı.");
  }

  try {
    await invalidateUserReadCaches(params.userId);
  } catch (error) {
    logger.warn("[chat-delete] cache invalidate failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    deletedIds: deletedRows.map((row) => row.id),
    deletedPendingIds,
    rolledBackPendingIds,
    clearedMemoryCount: memoryDeleted?.length ?? 0,
  };
}
