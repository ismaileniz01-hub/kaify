import { extractPhysiqueFromCoachText, extractPhysiqueFromLeoPayload } from "@/lib/kaios/context/physique-summary";
import {
  extractMealMacrosFromCoachText,
  extractMealMacrosFromRecord,
} from "@/lib/kaios/nutrition/parse-macros";
import {
  extractMealBlocks,
  extractWorkoutDays,
  parseWorkoutDaysFromSpeech,
} from "@/lib/kaios/plan-speech";
import type { BaseEnvelope } from "@/lib/kaios/schemas/envelope";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Puts a rich-card payload on the envelope when the coach already stated the
 * numbers in prose. No second model call — the chart reads the same figures.
 */
export function attachSpokenRichCard(input: {
  coachId: string;
  intent: string;
  envelope: BaseEnvelope;
  assistantText: string;
}): BaseEnvelope {
  const ui = { ...(asRecord(input.envelope.ui) ?? {}) };
  const text = input.assistantText;

  if (input.coachId === "alex") {
    const existing = extractWorkoutDays(input.envelope.ui);
    const fromData =
      existing.length > 0 ? existing : extractWorkoutDays(input.envelope.data);
    if (fromData.some((day) => (day.exercises?.length ?? 0) > 0)) {
      if (ui.cardType == null) ui.cardType = "workout_plan";
      return { ...input.envelope, ui };
    }
    const spoken = parseWorkoutDaysFromSpeech(text).filter(
      (day) => (day.exercises?.length ?? 0) > 0,
    );
    if (spoken.length === 0) return input.envelope;
    return {
      ...input.envelope,
      ui: { ...ui, cardType: "workout_plan", days: spoken },
    };
  }

  if (input.coachId === "maya") {
    const meals = extractMealBlocks(input.envelope.ui);
    const fromData = meals.length > 0 ? meals : extractMealBlocks(input.envelope.data);
    if (fromData.length > 0) {
      return { ...input.envelope, ui: { ...ui, cardType: "meal_plan" } };
    }
    const macros =
      extractMealMacrosFromRecord(input.envelope.ui) ??
      extractMealMacrosFromRecord(input.envelope.data) ??
      extractMealMacrosFromCoachText(text);
    if (macros) {
    return {
      ...input.envelope,
      ui: {
        ...ui,
        cardType: "analysis",
        food_analysis: {
          calories: macros.calories,
          protein: macros.protein,
          carb: macros.carbs,
          fat: macros.fat,
        },
      },
    };
    }
    if (ui.cardType === "meal_plan") {
      return { ...input.envelope, ui };
    }
    return input.envelope;
  }

  if (input.coachId === "leo") {
    const existing = extractPhysiqueFromLeoPayload({
      ...input.envelope,
      ui,
      data: input.envelope.data,
    });
    if (existing && Object.keys(existing.scores).length > 0) {
      if (ui.cardType == null) ui.cardType = "score";
      return { ...input.envelope, ui };
    }
    const fromText = extractPhysiqueFromCoachText(text);
    if (!fromText) return input.envelope;
    return {
      ...input.envelope,
      ui: { ...ui, cardType: "score" },
      data: {
        ...(asRecord(input.envelope.data) ?? {}),
        scores: fromText.scores,
        ...(fromText.overall != null ? { overall_score: fromText.overall } : {}),
      },
    };
  }

  if (input.coachId === "kai") {
    const data = asRecord(input.envelope.data);
    const nutrition = asRecord(ui.nutrition) ?? asRecord(data?.nutrition);
    if (!nutrition && ui.cardType !== "daily_summary") return input.envelope;
    return {
      ...input.envelope,
      ui: {
        ...ui,
        cardType: "daily_summary",
        ...(nutrition ? { nutrition } : {}),
      },
    };
  }

  return input.envelope;
}
