/**
 * Maya must nudge water after every logged/photographed meal.
 * Capsules teach the voice; this helper guarantees the line if the model skips it.
 */

import { parseHydrationLiters } from "@/lib/kaios/analytics/chat-log";
import {
  looksLikeFoodConsumption,
  type CoachId,
  type Intent,
} from "@/lib/kaios/routing/intent";

const WATER_MENTION_RE =
  /\b(su|suyu|water|hydrat|agua|wasser|eau|ماء|bardak)\b/i;

const NUDGE_BY_LOCALE: Record<string, string> = {
  tr: "Öğünden sonra bir bardak su içmeyi unutma.",
  en: "Don't forget a glass of water after that meal.",
  de: "Vergiss nach dem Essen ein Glas Wasser nicht.",
  es: "No olvides un vaso de agua después de esa comida.",
  fr: "N'oublie pas un verre d'eau après ce repas.",
  ar: "لا تنسَ شرب كوب ماء بعد الوجبة.",
};

function localePrefix(locale: string): string {
  const raw = locale.trim().toLowerCase();
  const prefix = raw.split(/[-_]/)[0] ?? "en";
  return prefix in NUDGE_BY_LOCALE ? prefix : "en";
}

export function mealWaterNudge(locale: string): string {
  return NUDGE_BY_LOCALE[localePrefix(locale)] ?? NUDGE_BY_LOCALE.en;
}

export function mentionsWater(text: string): boolean {
  return WATER_MENTION_RE.test(text);
}

export function shouldRemindWaterAfterMeal(input: {
  coachId: CoachId | string;
  intent?: Intent | string;
  userMessage?: string;
}): boolean {
  if (input.coachId !== "maya") return false;
  const msg = input.userMessage?.trim() ?? "";
  if (parseHydrationLiters(msg) != null) return false;
  if (looksLikeFoodConsumption(msg)) return true;
  return input.intent === "meal_analysis";
}

export function ensureMayaMealWaterReminder(input: {
  text: string;
  locale: string;
  coachId: CoachId | string;
  intent?: Intent | string;
  userMessage?: string;
}): string {
  const text = input.text.trim();
  if (!text) return input.text;
  if (!shouldRemindWaterAfterMeal(input)) return input.text;
  if (mentionsWater(text)) return input.text;
  return `${text}\n\n${mealWaterNudge(input.locale)}`;
}
