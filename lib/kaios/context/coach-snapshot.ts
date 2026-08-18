/**
 * Compact cross-coach facts for USER_CONTEXT.
 * Coaches must use these instead of re-asking or inventing teammate data.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTodayNutritionSnapshot } from "@/lib/services/analytics.service";
import {
  extractAlexPlanFocus,
  extractPhysiqueFromLeoPayload,
  formatNutritionSnapshot,
} from "@/lib/kaios/context/physique-summary";

export {
  extractAlexPlanFocus,
  extractPhysiqueFromLeoPayload,
  formatNutritionSnapshot,
  summarizePhysiqueScores,
} from "@/lib/kaios/context/physique-summary";

function compactPhysiqueRows(rows: unknown[]): string {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const payload = (row as { payload?: unknown }).payload;
    const summary = extractPhysiqueFromLeoPayload(payload);
    if (summary?.compact) return summary.compact;
  }
  return "";
}

/** Compact teammate snapshot for every 1:1 coach turn. */
export async function loadCrossCoachSnapshot(userId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const [nutrition, leoRows, alexRows] = await Promise.all([
    getTodayNutritionSnapshot(userId).catch(() => null),
    admin
      .from("chat_messages")
      .select("payload")
      .eq("user_id", userId)
      .eq("coach_id", "leo")
      .eq("sender", "coach")
      .in("message_type", ["score", "analysis"])
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("chat_messages")
      .select("payload")
      .eq("user_id", userId)
      .eq("coach_id", "alex")
      .eq("sender", "coach")
      .eq("message_type", "workout_plan")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const parts: string[] = [];
  if (nutrition) {
    const nutritionLine = formatNutritionSnapshot(nutrition);
    if (nutritionLine) parts.push(nutritionLine);
  }
  const physique = compactPhysiqueRows(leoRows.data ?? []);
  if (physique) parts.push(physique);
  const plan = extractAlexPlanFocus(alexRows.data?.[0]?.payload);
  if (plan) parts.push(plan);
  return parts.join("; ");
}
