import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { invalidateUserReadCaches } from "@/lib/cache/invalidate";
import type { Json } from "@/lib/types/database.types";

export async function writeAnalyticsDailyPatch(
  userId: string,
  entryDate: string,
  patch: Json,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("upsert_analytics_daily", {
    p_user_id: userId,
    p_entry_date: entryDate,
    p_patch: patch,
  });

  if (error) {
    logger.error("[analytics-write] upsert error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Analiz verisi güncellenemedi.");
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

  await admin.from("health_steps").upsert(
    entries.map((entry) => ({
      user_id: userId,
      entry_date: entry.date,
      steps: entry.steps,
      source: entry.source,
      synced_at: syncedAt,
    })),
    { onConflict: "user_id,entry_date,source" },
  );
}

export async function invalidateAnalyticsUserCache(userId: string): Promise<void> {
  await invalidateUserReadCaches(userId);
}
