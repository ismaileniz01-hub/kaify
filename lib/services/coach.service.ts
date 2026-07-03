import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/types/database.types";

export type CoachRow = Database["public"]["Tables"]["coaches"]["Row"];

/** Loads an active coach by id; throws NOT_FOUND when missing/inactive. */
export async function getCoachOrThrow(coachId: string): Promise<CoachRow> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", coachId)
    .maybeSingle();

  if (error) {
    logger.error("[coach.service] load error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Koç bilgisi alınamadı.");
  }
  if (!data || !data.is_active) {
    throw new ApiError("NOT_FOUND", "Koç bulunamadı.");
  }
  return data;
}

/** Lists all active coaches ordered for display. */
export async function listActiveCoaches(): Promise<CoachRow[]> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    logger.error("[coach.service] list error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Koçlar alınamadı.");
  }
  return data ?? [];
}
