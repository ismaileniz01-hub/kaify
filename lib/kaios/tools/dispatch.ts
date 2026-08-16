/**
 * Bounded KAIOS tool dispatch — no open ReAct loops.
 * Prefer 0 tools; at most one read prefetch + one write/validate sequence.
 */

import type { CoachId, Intent } from "@/lib/kaios/routing/intent";
import {
  executeTool,
  type ToolName,
  type ToolResult,
} from "@/lib/kaios/tools/index";
import {
  isToolAllowedForCoach,
  mapActionTypeToTool,
} from "@/lib/kaios/tools/allowlist";
import type { ActionTruthRecord } from "@/lib/kaios/tools/action-truth";
import type { BaseEnvelope } from "@/lib/kaios/schemas/envelope";
import { parseToolActionResponse } from "@/lib/kaios/schemas/envelope";

const MAX_POST_MODEL_TOOLS = 1;

export type DispatchResult = {
  truths: ActionTruthRecord[];
  toolResults: Array<{ name: ToolName; result: ToolResult }>;
  /** Pending meal confirmation for UI card. */
  confirmation?: { pendingId: string; summary: string };
  /** Knowledge lines to inject before model (prefetch). */
  knowledgeLines: string[];
};

function resultToTruth(
  tool: ToolName,
  result: ToolResult,
): ActionTruthRecord {
  if (!result.ok) {
    return {
      status: "FAILED",
      tool,
      code: result.code,
      message: result.message,
    };
  }
  const data = result.data as Record<string, unknown> | null;
  if (
    tool === "saveMealMacros" &&
    data &&
    data.requiresConfirmation === true
  ) {
    return {
      status: "PENDING_CONFIRMATION",
      tool,
      message:
        typeof data.message === "string"
          ? data.message
          : "Awaiting user confirmation",
      data,
    };
  }
  if (tool === "recordHydration" && data && data.saved === true) {
    return { status: "SUCCEEDED", tool, data };
  }
  // Reads and validations that succeed are SUCCEEDED for their narrow purpose.
  if (
    tool === "getNutritionState" ||
    tool === "getPhysiqueHistory" ||
    tool === "searchExercises" ||
    tool === "validateExerciseIds"
  ) {
    return { status: "SUCCEEDED", tool, data };
  }
  return { status: "SUCCEEDED", tool, data };
}

/** Prefetch read-only tools before the model call (max 1). */
export async function prefetchToolKnowledge(input: {
  userId: string;
  coach: CoachId;
  intent: Intent;
  message: string;
}): Promise<DispatchResult> {
  const out: DispatchResult = { truths: [], toolResults: [], knowledgeLines: [] };

  if (
    (input.coach === "maya" || input.coach === "kai") &&
    (input.intent === "nutrition_question" ||
      input.intent === "meal_plan" ||
      input.intent === "meal_analysis" ||
      input.intent === "hydration" ||
      /\b(kalori|protein|macro|bugün ne yedim|daily totals|how much.*(eat|protein|cal))\b/i.test(
        input.message,
      ))
  ) {
    if (!isToolAllowedForCoach(input.coach, "getNutritionState")) return out;
    const result = await executeTool(input.userId, {
      name: "getNutritionState",
      args: {},
    });
    out.toolResults.push({ name: "getNutritionState", result });
    out.truths.push(resultToTruth("getNutritionState", result));
    if (result.ok) {
      out.knowledgeLines.push(
        `canonical_nutrition_today: ${JSON.stringify(result.data)}`,
      );
    } else {
      out.knowledgeLines.push(
        `canonical_nutrition_today: UNAVAILABLE (${result.code})`,
      );
    }
    return out;
  }

  if (
    input.coach === "alex" &&
    (input.intent === "programming" || input.intent === "exercise_form") &&
    /\b(substitute|alternative|swap|yerine|alternatif|library|exercise id)\b/i.test(
      input.message,
    )
  ) {
    if (!isToolAllowedForCoach(input.coach, "searchExercises")) return out;
    const q = input.message.slice(0, 80);
    const result = await executeTool(input.userId, {
      name: "searchExercises",
      args: { q },
    });
    out.toolResults.push({ name: "searchExercises", result });
    out.truths.push(resultToTruth("searchExercises", result));
    if (result.ok) {
      const items = (result.data as { items?: unknown[] })?.items ?? [];
      out.knowledgeLines.push(
        `exercise_library_candidates: ${JSON.stringify(items).slice(0, 1200)}`,
      );
    }
  }

  if (
    input.coach === "leo" &&
    input.intent === "physique_analysis"
  ) {
    if (!isToolAllowedForCoach(input.coach, "getPhysiqueHistory")) return out;
    const result = await executeTool(input.userId, {
      name: "getPhysiqueHistory",
      args: {},
    });
    out.toolResults.push({ name: "getPhysiqueHistory", result });
    out.truths.push(resultToTruth("getPhysiqueHistory", result));
    if (result.ok) {
      out.knowledgeLines.push(
        `physique_history: ${JSON.stringify(result.data).slice(0, 1200)}`,
      );
    }
  }

  return out;
}

function extractExerciseIds(envelope: BaseEnvelope): string[] {
  const ids = new Set<string>();
  const collect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) collect(item);
      return;
    }
    const obj = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (
        (k === "exercise_id" || k === "id") &&
        typeof v === "string" &&
        v.trim()
      ) {
        ids.add(v.trim());
      }
      if (
        (k === "exercise_ids" ||
          k === "alternate_exercise_ids" ||
          k === "ids") &&
        Array.isArray(v)
      ) {
        for (const id of v) {
          if (typeof id === "string" && id.trim()) ids.add(id.trim());
        }
      }
      if (typeof v === "object") collect(v);
    }
  };
  collect(envelope.data);
  collect(envelope.ui);
  return [...ids];
}

/**
 * Post-model bounded tool execution (max 1 write/validate).
 * Also validates Alex programming exercise IDs.
 */
export async function dispatchPostModelTools(input: {
  userId: string;
  coach: CoachId;
  intent: Intent;
  envelope: BaseEnvelope;
}): Promise<DispatchResult> {
  const out: DispatchResult = { truths: [], toolResults: [], knowledgeLines: [] };
  let calls = 0;

  // Alex programming: validate IDs when present; never claim applied.
  if (input.coach === "alex" && input.intent === "programming") {
    const ids = extractExerciseIds(input.envelope);
    if (ids.length > 0 && isToolAllowedForCoach("alex", "validateExerciseIds")) {
      const result = await executeTool(input.userId, {
        name: "validateExerciseIds",
        args: { ids },
      });
      out.toolResults.push({ name: "validateExerciseIds", result });
      out.truths.push(resultToTruth("validateExerciseIds", result));
      calls += 1;
      // Always mark program application as unsupported / proposed.
      out.truths.push({
        status: "PROPOSED",
        tool: "applyProgram",
        message:
          "No apply-program backend — recommendation is PROPOSED only; not applied to product state.",
      });
      return out;
    }
    out.truths.push({
      status: "PROPOSED",
      tool: "applyProgram",
      message:
        "Program recommendation is PROPOSED only; no apply-program tool exists.",
    });
  }

  if (calls >= MAX_POST_MODEL_TOOLS) return out;

  // Explicit tool_action envelope (or actions array).
  const toolParse = parseToolActionResponse(input.envelope);
  const actions =
    toolParse.ok
      ? toolParse.data.actions
      : Array.isArray(input.envelope.actions)
        ? (input.envelope.actions as Array<{
            type?: string;
            payload?: Record<string, unknown>;
          }>)
        : [];

  if (actions.length === 0) return out;

  const action = actions[0];
  const type =
    action && typeof action === "object" && typeof action.type === "string"
      ? action.type
      : null;
  if (!type) {
    out.truths.push({
      status: "UNSUPPORTED",
      message: "Missing action type",
    });
    return out;
  }

  const tool = mapActionTypeToTool(type);
  if (!tool) {
    out.truths.push({
      status: "UNSUPPORTED",
      tool: type,
      message: `Unsupported action: ${type}`,
    });
    return out;
  }

  if (!isToolAllowedForCoach(input.coach, tool)) {
    out.truths.push({
      status: "FAILED",
      tool,
      code: "TOOL_NOT_ALLOWED",
      message: `Coach ${input.coach} is not allowed to call ${tool}`,
    });
    return out;
  }

  // applyProgram never exists
  if (/apply.?program/i.test(type)) {
    out.truths.push({
      status: "UNSUPPORTED",
      tool: type,
      message: "Applying a program is not supported; proposal only.",
    });
    return out;
  }

  const args =
    action && typeof action === "object" && action.payload
      ? action.payload
      : {};

  const result = await executeTool(input.userId, { name: tool, args });
  out.toolResults.push({ name: tool, result });
  const truth = resultToTruth(tool, result);
  out.truths.push(truth);

  if (
    truth.status === "PENDING_CONFIRMATION" &&
    result.ok &&
    result.data &&
    typeof result.data === "object"
  ) {
    const data = result.data as {
      pendingId?: string;
      message?: string;
    };
    if (typeof data.pendingId === "string") {
      out.confirmation = {
        pendingId: data.pendingId,
        summary:
          typeof data.message === "string"
            ? data.message
            : "Confirm to save meal macros",
      };
    }
  }

  return out;
}
