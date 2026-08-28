/**
 * Bounded KAIOS tool dispatch — no open ReAct loops.
 * Prefer 0 tools; at most one read prefetch + one write/validate sequence.
 */

import {
  looksLikeFoodConsumption,
  looksLikeMealSaveFollowUp,
  type CoachId,
  type Intent,
} from "@/lib/kaios/routing/intent";
import { extractMealMacrosFromCoachText, extractMealMacrosFromRecord } from "@/lib/kaios/nutrition/parse-macros";
import { createPendingAnalyticsConfirmation } from "@/lib/services/analytics-confirmation.service";
import { confirmationCardFromPending } from "@/lib/analytics/confirmation-payload";
import { parseHydrationLiters } from "@/lib/kaios/analytics/chat-log";
import { getTodayNutritionSnapshot } from "@/lib/services/analytics.service";
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
import {
  getExerciseById,
  getExerciseCatalog,
  type ExerciseEquipment,
} from "@/lib/kaios/exercises/catalog";

const MAX_POST_MODEL_TOOLS = 1;

export function resolveEquipmentPreference(input: {
  userState?: string;
  memoryItems?: string[];
}): ExerciseEquipment | null {
  const sources = [...(input.memoryItems ?? []), input.userState ?? ""];
  for (const source of sources) {
    const match = source.match(
      /(?:equipment|equipment_access)\s*:\s*(home(?:\s*\/\s*limited)?|limited|gym)\b/i,
    );
    if (!match) continue;
    return match[1]?.toLowerCase() === "gym" ? "gym" : "home";
  }
  return null;
}

export function equipmentCatalogCandidates(
  equipment: ExerciseEquipment,
): Array<{ id: string; name: string; muscle: string; equipment: ExerciseEquipment }> {
  const perMuscle = new Map<string, number>();
  return getExerciseCatalog()
    .filter((exercise) => exercise.equipment === equipment)
    .filter((exercise) => {
      const count = perMuscle.get(exercise.muscle) ?? 0;
      if (count >= 3) return false;
      perMuscle.set(exercise.muscle, count + 1);
      return true;
    })
    .map(({ id, name, muscle }) => ({ id, name, muscle, equipment }));
}

export type DispatchResult = {
  truths: ActionTruthRecord[];
  toolResults: Array<{ name: ToolName; result: ToolResult }>;
  /** Pending meal confirmation for UI card. */
  confirmation?: {
    pendingId: string;
    summary: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
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
    (tool === "saveMealMacros" || tool === "recordHydration") &&
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
  userState?: string;
  memoryItems?: string[];
}): Promise<DispatchResult> {
  const out: DispatchResult = { truths: [], toolResults: [], knowledgeLines: [] };
  const equipment = resolveEquipmentPreference(input);

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
    input.intent === "programming" &&
    isToolAllowedForCoach(input.coach, "getPhysiqueHistory")
  ) {
    const result = await executeTool(input.userId, {
      name: "getPhysiqueHistory",
      args: {},
    });
    out.toolResults.push({ name: "getPhysiqueHistory", result });
    out.truths.push(resultToTruth("getPhysiqueHistory", result));
    if (result.ok) {
      const data = result.data as {
        compact?: string;
        lagging?: string[];
        priority?: string | null;
        overall?: number | null;
      };
      const compact =
        typeof data.compact === "string" && data.compact.trim()
          ? data.compact
          : JSON.stringify(result.data).slice(0, 400);
      out.knowledgeLines.push(`recent_physique_history: ${compact}`);
    } else {
      out.knowledgeLines.push(
        `recent_physique_history: UNAVAILABLE (${result.code})`,
      );
    }
  }

  if (input.coach === "alex" && input.intent === "programming" && equipment) {
    out.knowledgeLines.push(
      `required_equipment: ${equipment}; exercise_library_candidates: ${JSON.stringify(
        equipmentCatalogCandidates(equipment),
      )}`,
    );
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
      const data = result.data as { compact?: string };
      const compact =
        typeof data.compact === "string" && data.compact.trim()
          ? data.compact
          : JSON.stringify(result.data).slice(0, 400);
      out.knowledgeLines.push(`physique_history: ${compact}`);
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
  expectedEquipment?: ExerciseEquipment | null;
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
      const wrongEquipment = input.expectedEquipment
        ? ids.filter((id) => {
            const exercise = getExerciseById(id);
            return exercise && exercise.equipment !== input.expectedEquipment;
          })
        : [];
      if (wrongEquipment.length > 0) {
        out.truths.push({
          status: "FAILED",
          tool: "validateExerciseIds",
          code: "EQUIPMENT_MISMATCH",
          message: `Exercises do not match ${input.expectedEquipment} equipment: ${wrongEquipment.join(", ")}`,
          data: { invalidEquipmentIds: wrongEquipment },
        });
      } else {
        out.truths.push(resultToTruth("validateExerciseIds", result));
      }
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

/**
 * True when Maya just estimated a logged meal and we should offer analytics save.
 * Does not fire on general nutrition Q&A (protein targets, meal plans).
 */
export function macrosForMayaFoodLogConfirm(input: {
  coach: CoachId;
  userMessage: string;
  assistantText: string;
  alreadyConfirming?: boolean;
  envelopeData?: unknown;
  envelopeUi?: unknown;
  previousAssistantText?: string;
}): ReturnType<typeof extractMealMacrosFromCoachText> {
  if (input.alreadyConfirming) return null;
  if (input.coach !== "maya") return null;
  const followUp = looksLikeMealSaveFollowUp(
    input.userMessage,
    input.previousAssistantText,
  );
  if (!looksLikeFoodConsumption(input.userMessage) && !followUp) return null;
  return (
    extractMealMacrosFromCoachText(input.assistantText) ??
    extractMealMacrosFromCoachText(input.userMessage) ??
    (followUp
      ? extractMealMacrosFromCoachText(input.previousAssistantText ?? "")
      : null) ??
    extractMealMacrosFromRecord(input.envelopeData) ??
    extractMealMacrosFromRecord(input.envelopeUi)
  );
}

/**
 * After an unstructured Maya food-log reply, queue a yes/no analytics card.
 * Never silent-write macros — reporting "I ate X" is not the confirmation.
 */
export async function maybeQueueMayaFoodLogConfirmation(input: {
  userId: string;
  coach: CoachId;
  userMessage: string;
  assistantText: string;
  alreadyConfirming?: boolean;
  envelopeData?: unknown;
  envelopeUi?: unknown;
  currentWaterLiters?: number;
  previousAssistantText?: string;
}): Promise<DispatchResult> {
  const out: DispatchResult = { truths: [], toolResults: [], knowledgeLines: [] };
  const macros = macrosForMayaFoodLogConfirm(input);
  if (!macros) return out;
  if (!isToolAllowedForCoach(input.coach, "saveMealMacros")) return out;

  let current = Math.max(0, input.currentWaterLiters ?? 0);
  if (input.currentWaterLiters == null) {
    try {
      const snap = await getTodayNutritionSnapshot(input.userId);
      current = Math.max(0, snap.waterLiters ?? 0);
    } catch {
      current = 0;
    }
  }
  const waterThisTurn = parseHydrationLiters(input.userMessage);
  const glass = 0.25;
  const waterTotal =
    waterThisTurn != null
      ? Math.min(30, Math.round((current + waterThisTurn) * 100) / 100)
      : Math.min(30, Math.round((current + glass) * 100) / 100);
  const waterDelta = waterThisTurn ?? glass;

  try {
    const pendingPayload = {
      summary: `${Math.round(macros.calories)} kcal · P${Math.round(macros.protein)} C${Math.round(macros.carbs)} F${Math.round(macros.fat)} + ${waterDelta}L water`,
      meal: macros,
      patch: { waterLiters: waterTotal },
    };
    const pendingId = await createPendingAnalyticsConfirmation({
      userId: input.userId,
      coachId: "maya",
      source: "chat",
      payload: pendingPayload,
    });
    out.confirmation = confirmationCardFromPending(pendingId, pendingPayload);
    out.truths.push({
      status: "PENDING_CONFIRMATION",
      tool: "saveMealMacros",
      message: "Awaiting user confirmation",
      data: { pendingId, saved: false, ...macros, waterLiters: waterTotal },
    });
  } catch {
    out.truths.push({
      status: "FAILED",
      tool: "saveMealMacros",
      code: "SAVE_FAILED",
      message: "Meal could not be queued for confirmation.",
    });
  }
  return out;
}
