import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { sanitizeAnalyticsPatch, sanitizeMealMacros } from "@/lib/analytics/bounds";
import { logger } from "@/lib/logger";
import { invalidateUserReadCaches } from "@/lib/cache/invalidate";
import type { Json } from "@/lib/types/database.types";

export async function writeAnalyticsDailyPatch(
  userId: string,
  entryDate: string,
  patch: Json,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const sanitized = sanitizeAnalyticsPatch(
    (patch ?? {}) as Record<string, unknown>,
  );
  const { error } = await admin.rpc("upsert_analytics_daily", {
    p_user_id: userId,
    p_entry_date: entryDate,
    p_patch: sanitized as unknown as Json,
  });

  if (error) {
    logger.error("[analytics-write] upsert error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Analiz verisi güncellenemedi.");
  }
}

/** Atomic additive meal macros — no read-modify-write. */
export async function writeAnalyticsMealIncrement(
  userId: string,
  entryDate: string,
  mealInput: { calories: number; protein: number; carbs: number; fat: number },
): Promise<void> {
  const meal = sanitizeMealMacros(mealInput);
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("increment_analytics_meals", {
    p_user_id: userId,
    p_entry_date: entryDate,
    p_calories: meal.calories,
    p_protein: meal.protein,
    p_carbs: meal.carbs,
    p_fat: meal.fat,
  });

  if (error) {
    logger.error("[analytics-write] meal increment error", {
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Öğün verisi eklenemedi.");
  }
}

/** Claim + apply pending confirmation in one DB transaction. */
export async function writeConfirmAnalyticsPending(
  userId: string,
  pendingId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("confirm_analytics_pending", {
    p_user_id: userId,
    p_pending_id: pendingId,
  });

  if (error) {
    if (error.code === "P0002") {
      throw new ApiError("NOT_FOUND", "Onay bekleyen kayıt bulunamadı.");
    }
    logger.error("[analytics-write] confirm pending error", {
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Onay uygulanamadı.");
  }
}

export async function writeHealthStepsBatch(
  userId: string,
  entries: {
    date: string;
    steps: number;
    source: "healthkit" | "google_fit" | "manual";
  }[],
): Promise<void> {
  if (entries.length === 0) return;

  const admin = createAdminSupabaseClient();
  const syncedAt = new Date().toISOString();

  const { error } = await admin.from("health_steps").upsert(
    entries.map((entry) => ({
      user_id: userId,
      entry_date: entry.date,
      steps: entry.steps,
      source: entry.source,
      synced_at: syncedAt,
    })),
    { onConflict: "user_id,entry_date,source" },
  );

  if (error) {
    logger.error("[analytics-write] health_steps upsert error", {
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Adım verisi kaydedilemedi.");
  }
}

export async function invalidateAnalyticsUserCache(userId: string): Promise<void> {
  await invalidateUserReadCaches(userId);
}
