/**
 * Per-coach least-privilege tool allowlists for KAIOS chat.
 * Models never authorize tools; server enforces this matrix.
 */

import type { CoachId } from "@/lib/kaios/routing/intent";
import type { ToolName } from "@/lib/kaios/tools/index";

const MAYA_TOOLS: ReadonlySet<ToolName> = new Set([
  "getNutritionState",
  "saveMealMacros",
  "recordHydration",
]);

const ALEX_TOOLS: ReadonlySet<ToolName> = new Set([
  "searchExercises",
  "validateExerciseIds",
]);

const LEO_TOOLS: ReadonlySet<ToolName> = new Set(["getPhysiqueHistory"]);

const KAI_TOOLS: ReadonlySet<ToolName> = new Set([
  "getNutritionState", // read-only situational awareness
]);

const COUNCIL_TOOLS: ReadonlySet<ToolName> = new Set([]);

export function toolsAllowedForCoach(coach: CoachId): ReadonlySet<ToolName> {
  switch (coach) {
    case "maya":
      return MAYA_TOOLS;
    case "alex":
      return ALEX_TOOLS;
    case "leo":
      return LEO_TOOLS;
    case "kai":
      return KAI_TOOLS;
    case "council":
      return COUNCIL_TOOLS;
    default:
      return new Set();
  }
}

export function isToolAllowedForCoach(
  coach: CoachId,
  tool: ToolName,
): boolean {
  return toolsAllowedForCoach(coach).has(tool);
}

const ACTION_TYPE_TO_TOOL: Record<string, ToolName> = {
  searchExercises: "searchExercises",
  search_exercises: "searchExercises",
  validateExerciseIds: "validateExerciseIds",
  validate_exercise_ids: "validateExerciseIds",
  getNutritionState: "getNutritionState",
  get_nutrition_state: "getNutritionState",
  getPhysiqueHistory: "getPhysiqueHistory",
  get_physique_history: "getPhysiqueHistory",
  saveMealMacros: "saveMealMacros",
  save_meal_macros: "saveMealMacros",
  save_meal: "saveMealMacros",
  recordHydration: "recordHydration",
  record_hydration: "recordHydration",
  log_water: "recordHydration",
};

/** Map model action.type → ToolName; unknown → null (unsupported). */
export function mapActionTypeToTool(actionType: string): ToolName | null {
  return ACTION_TYPE_TO_TOOL[actionType] ?? null;
}
