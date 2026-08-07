/**
 * Narrow domain tool router stub.
 * Tools are backend-authorized; the model never supplies privileged userId.
 */

export type ToolName =
  | "searchExercises"
  | "getNutritionState"
  | "getPhysiqueHistory"
  | "saveMealMacros"
  | "recordHydration";

export type ToolRequest = {
  name: ToolName;
  args: Record<string, unknown>;
};

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string; message: string };

import { searchExercises } from "@/lib/kaios/exercises";
import { assertExerciseIdsExist } from "@/lib/kaios/exercises";

/**
 * Execute a tool with server-bound user identity (never trust args.userId).
 */
export async function executeTool(
  userId: string,
  req: ToolRequest,
): Promise<ToolResult> {
  void userId;
  switch (req.name) {
    case "searchExercises": {
      const q = typeof req.args.q === "string" ? req.args.q : undefined;
      const muscle =
        typeof req.args.muscle === "string" ? req.args.muscle : undefined;
      const items = searchExercises({ q, muscle, limit: 8 });
      return { ok: true, data: { items } };
    }
    default:
      return {
        ok: false,
        code: "TOOL_NOT_IMPLEMENTED",
        message: `Tool ${req.name} is not wired yet`,
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
  return { ok: true, data: { valid: true } };
}
