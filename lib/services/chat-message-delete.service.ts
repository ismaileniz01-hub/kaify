import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { invalidateUserReadCaches } from "@/lib/cache/invalidate";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/types/database.types";

type MessageRow = {
  id: string;
  coach_id: string | null;
  reply_to_message_id: string | null;
  thread_type: string;
  sender: string;
};

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
  const adminAny = admin as any;
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

function collectImpactIds(rows: MessageRow[], rootId: string): string[] {
  const byParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.reply_to_message_id) continue;
    const bucket = byParent.get(row.reply_to_message_id) ?? [];
    bucket.push(row.id);
    byParent.set(row.reply_to_message_id, bucket);
  }

  const seen = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of byParent.get(id) ?? []) stack.push(child);
  }
  return [...seen];
}

export async function deleteChatMessage(params: {
  userId: string;
  messageId: string;
}): Promise<DeleteChatMessageResult> {
  const admin = createAdminSupabaseClient();
  const adminAny = admin as any;
  const { data: target, error: targetError } = await admin
    .from("chat_messages")
    .select("id, coach_id, reply_to_message_id, thread_type, sender")
    .eq("id", params.messageId)
    .eq("user_id", params.userId)
    .eq("thread_type", "direct")
    .maybeSingle<MessageRow>();
  if (targetError) {
    throw new ApiError("INTERNAL_ERROR", "Mesaj silme bilgisi okunamadı.");
  }
  if (!target) {
    throw new ApiError("NOT_FOUND", "Silinecek mesaj bulunamadı.");
  }

  let threadQuery = admin
    .from("chat_messages")
    .select("id, coach_id, reply_to_message_id, thread_type, sender")
    .eq("user_id", params.userId)
    .eq("thread_type", "direct");
  if (target.coach_id) {
    threadQuery = threadQuery.eq("coach_id", target.coach_id);
  }
  const { data: threadRows, error: rowsError } = await threadQuery.order("created_at", {
    ascending: true,
  });
  if (rowsError) {
    throw new ApiError("INTERNAL_ERROR", "Mesaj zinciri okunamadı.");
  }

  const impactIds = collectImpactIds((threadRows ?? []) as MessageRow[], target.id);
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", params.userId)
    .maybeSingle();
  const timezone =
    typeof profile?.timezone === "string" && profile.timezone.trim()
      ? profile.timezone
      : "UTC";

  const { data: pendingByMessage, error: pendingError } = await adminAny
    .from("analytics_pending_confirmations")
    .select("id, payload, status, message_id, created_at, resolved_at, source_message_id")
    .eq("user_id", params.userId)
    .in("message_id", impactIds);
  if (pendingError) {
    throw new ApiError("INTERNAL_ERROR", "Bağlı analytics kayıtları okunamadı.");
  }
  const { data: pendingBySource, error: pendingSourceError } = await adminAny
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
    const { error } = await adminAny
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
