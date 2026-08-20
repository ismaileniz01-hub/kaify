/**
 * Compact cross-coach facts for USER_CONTEXT.
 * Coaches must use these instead of re-asking or inventing teammate data.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTodayNutritionSnapshot } from "@/lib/services/analytics.service";
import { logger } from "@/lib/logger";
import {
  extractAlexPlanFocus,
  extractAlexPlanFocusFromSpeech,
  extractPhysiqueFromLeoPayload,
  formatNutritionSnapshot,
} from "@/lib/kaios/context/physique-summary";

export {
  extractAlexPlanFocus,
  extractAlexPlanFocusFromSpeech,
  extractPhysiqueFromLeoPayload,
  formatNutritionSnapshot,
  humanizePlanDayLabel,
  prioritizeTeamFactLines,
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

export function pickAlexPlanFocus(rows: unknown[]): string {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as { payload?: unknown; content?: unknown };
    const fromPayload = extractAlexPlanFocus(rec.payload);
    if (fromPayload) return fromPayload;
    if (typeof rec.content === "string") {
      const fromSpeech = extractAlexPlanFocusFromSpeech(rec.content);
      if (fromSpeech) return fromSpeech;
    }
  }
  return "";
}

/** Compact teammate snapshot for every 1:1 coach turn. */
export async function loadCrossCoachSnapshot(userId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const [nutrition, leoRows, alexRows] = await Promise.all([
    getTodayNutritionSnapshot(userId).catch((error) => {
      logger.warn("kaios.snapshot.nutrition_failed", {
        userId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return null;
    }),
    admin
      .from("chat_messages")
      .select("payload")
      .eq("user_id", userId)
      .eq("coach_id", "leo")
      .eq("sender", "coach")
      .in("message_type", ["score", "analysis"])
      .order("created_at", { ascending: false })
      .limit(3),
    admin
      .from("chat_messages")
      .select("payload, content")
      .eq("user_id", userId)
      .eq("coach_id", "alex")
      .eq("sender", "coach")
      .in("message_type", ["workout_plan", "text"])
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const parts: string[] = [];
  if (nutrition) {
    const nutritionLine = formatNutritionSnapshot(nutrition);
    if (nutritionLine) parts.push(nutritionLine);
  }
  const physique = compactPhysiqueRows(leoRows.data ?? []);
  if (physique) parts.push(physique);
  const plan = pickAlexPlanFocus(alexRows.data ?? []);
  if (plan) parts.push(plan);
  return parts.join("; ");
}
