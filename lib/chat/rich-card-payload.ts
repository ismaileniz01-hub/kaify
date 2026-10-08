import {
  extractMealMacrosFromCoachText,
  extractMealMacrosFromRecord,
} from "@/lib/kaios/nutrition/parse-macros";

/** Unwrap KAIOS envelopes so cards read ui/data the same way as the snapshot. */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function unwrapChatCardPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const data = asRecord(payload.data);
  const ui = asRecord(payload.ui);
  return { ...payload, ...(data ?? {}), ...(ui ?? {}) };
}

export function looksLikeI18nKey(value: string): boolean {
  return /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/i.test(value.trim());
}

function stringField(
  rec: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = rec[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function planDayHeading(day: Record<string, unknown>): {
  day?: string;
  focus?: string;
} {
  const focus =
    stringField(day, "focus") ??
    stringField(day, "focusKey") ??
    stringField(day, "name") ??
    stringField(day, "title");
  const dayLabel = stringField(day, "dayKey") ?? stringField(day, "day");
  return { day: dayLabel, focus };
}

export function displayPlanLabel(
  raw: string | undefined,
  translate: (key: string) => string,
): string {
  if (!raw) return "";
  if (looksLikeI18nKey(raw)) return translate(raw);
  return raw.replace(/^workout\./i, "").replace(/_/g, " ");
}

export type FoodCardMacros = {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

/**
 * Maya's calorie ring. Reads envelope food_analysis first, then the spoken
 * macro line, so a text-only reply still draws the card.
 */
export function resolveFoodCardMacros(
  payload: unknown,
  fallbackText?: string,
): FoodCardMacros | null {
  const root = asRecord(payload) ?? {};
  const unwrapped = unwrapChatCardPayload(root);
  const parsed =
    extractMealMacrosFromRecord(unwrapped) ??
    extractMealMacrosFromRecord(root.analysis) ??
    extractMealMacrosFromRecord(root) ??
    (fallbackText?.trim()
      ? extractMealMacrosFromCoachText(fallbackText)
      : null);
  if (!parsed) return null;
  return {
    calories: parsed.calories,
    protein: parsed.protein,
    carb: parsed.carbs,
    fat: parsed.fat,
  };
}
