/**
 * Narrow domain tool router.
 * Tools are backend-authorized; the model never supplies privileged userId.
 * On failure, return ok:false — coaches must not claim tool success.
 */

export type ToolName =
  | "searchExercises"
  | "getNutritionState"
  | "getPhysiqueHistory"
  | "saveMealMacros"
  | "recordHydration"
  | "validateExerciseIds";

export type ToolRequest = {
  name: ToolName;
  args: Record<string, unknown>;
};

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string; message: string };

import { searchExercises, assertExerciseIdsExist } from "@/lib/kaios/exercises";
import { createPendingAnalyticsConfirmation } from "@/lib/services/analytics-confirmation.service";
import {
  getTodayNutritionSnapshot,
  patchAnalyticsDaily,
} from "@/lib/services/analytics.service";
import { invalidateAnalyticsUserCache } from "@/lib/repositories/analytics-write.repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { emitKaiosEventBestEffort } from "@/lib/kaios/events";
import { extractPhysiqueFromLeoPayload } from "@/lib/kaios/context/physique-summary";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Execute a tool with server-bound user identity (never trust args.userId).
 */
export async function executeTool(
  userId: string,
  req: ToolRequest,
): Promise<ToolResult> {
  // Strip any client-supplied ownership fields.
  const args = { ...req.args };
  delete args.userId;
  delete args.user_id;

  try {
    switch (req.name) {
      case "searchExercises": {
        const q = typeof args.q === "string" ? args.q : undefined;
        const muscle =
          typeof args.muscle === "string" ? args.muscle : undefined;
        const equipment =
          typeof args.equipment === "string" ? args.equipment : undefined;
        const items = searchExercises({ q, muscle, equipment, limit: 8 });
        return { ok: true, data: { items } };
      }

      case "validateExerciseIds": {
        const ids = Array.isArray(args.ids)
          ? args.ids.filter((x): x is string => typeof x === "string")
          : [];
        return validateProgramExerciseIds(ids);
      }

      case "getNutritionState": {
        const snap = await getTodayNutritionSnapshot(userId);
        return {
          ok: true,
          data: {
            calories: snap.caloriesConsumed,
            calorieGoal: snap.calorieGoal,
            proteinG: snap.proteinG,
            proteinGoal: snap.proteinGoalG,
            carbsG: snap.carbsG,
            carbsGoal: snap.carbsGoalG,
            fatG: snap.fatG,
            fatGoal: snap.fatGoalG,
            waterLiters: snap.waterLiters,
          },
        };
      }

      case "getPhysiqueHistory": {
        const admin = createAdminSupabaseClient();
        const { data, error } = await admin
          .from("chat_messages")
          .select("id, payload, created_at, message_type")
          .eq("user_id", userId)
          .eq("coach_id", "leo")
          .eq("sender", "coach")
          .in("message_type", ["score", "analysis"])
          .order("created_at", { ascending: false })
          .limit(5);
        if (error) {
          return {
            ok: false,
            code: "PHYSIQUE_HISTORY_UNAVAILABLE",
            message: "Physique history could not be loaded.",
          };
        }
        const items = data ?? [];
        const latest = items
          .map((row) => extractPhysiqueFromLeoPayload(row.payload))
          .find((summary) => summary !== null);
        return {
          ok: true,
          data: {
            items,
            compact: latest?.compact ?? "",
            lagging: latest?.lagging ?? [],
            priority: latest?.priority ?? null,
            overall: latest?.overall ?? null,
          },
        };
      }

      case "saveMealMacros": {
        // Never silent-write: create pending confirmation (Maya save safety).
        const calories = num(args.calories);
        const protein = num(args.protein);
        const carbs = num(args.carbs ?? args.carbohydrates);
        const fat = num(args.fat);
        if (
          calories == null ||
          protein == null ||
          carbs == null ||
          fat == null
        ) {
          return {
            ok: false,
            code: "INVALID_MACROS",
            message: "calories, protein, carbs, fat are required numbers.",
          };
        }
        const pendingId = await createPendingAnalyticsConfirmation({
          userId,
          coachId: "maya",
          source: "chat",
          payload: {
            summary: `${Math.round(calories)} kcal · P${Math.round(protein)} C${Math.round(carbs)} F${Math.round(fat)}`,
            meal: { calories, protein, carbs, fat },
          },
        });
        return {
          ok: true,
          data: {
            pendingId,
            requiresConfirmation: true,
            saved: false,
            message:
              "Meal prepared for confirmation — not saved until user confirms.",
          },
        };
      }

      case "recordHydration": {
        const liters = num(args.liters ?? args.waterLiters);
        if (liters == null || liters < 0) {
          return {
            ok: false,
            code: "INVALID_HYDRATION",
            message: "liters must be a non-negative number.",
          };
        }
        await patchAnalyticsDaily(userId, { waterLiters: liters });
        try {
          await invalidateAnalyticsUserCache(userId);
        } catch {
          // Write already landed; stale cache is retried on next read.
        }
        // Canonical write already succeeded — event is best-effort only.
        await emitKaiosEventBestEffort({
          category: "hydration",
          type: "hydration_recorded",
          userId,
          payload: { liters },
          at: new Date().toISOString(),
        });
        return { ok: true, data: { waterLiters: liters, saved: true } };
      }

      default:
        return {
          ok: false,
          code: "UNKNOWN_TOOL",
          message: `Unknown tool`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      code: "TOOL_EXECUTION_FAILED",
      message:
        error instanceof Error ? error.message : "Tool execution failed.",
    };
  }
}

export function validateProgramExerciseIds(ids: string[]): ToolResult {
  const { invalid } = assertExerciseIdsExist(ids);
  if (invalid.length > 0) {
    return {
      ok: false,
      code: "INVALID_EXERCISE_IDS",
      message: `Unknown exercise ids: ${invalid.join(", ")}`,
    };
  }
  return { ok: true, data: { valid: true, count: ids.length } };
}
