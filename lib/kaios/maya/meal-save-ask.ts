/**
 * Maya must ask before writing a meal (or suggested water) to analytics.
 * Capsules teach the voice; this helper guarantees the ask if the model skips it.
 */

import { isCoachRetryLine } from "@/lib/kaios/coach-retry";
import { looksLikeTurkishChat } from "@/lib/i18n/detect-message-locale";
import {
  looksLikeFoodConsumption,
  type CoachId,
  type Intent,
} from "@/lib/kaios/routing/intent";

const ASK_RE =
  /\b(kaydet|kaydedeyim|ekleyeyim|eklememi|onay|onaylıyor|onayliyor|confirm|save (this|it)|add (this|it) to (your )?analytics|analize ekle)\b/i;

const ASK_BY_LOCALE: Record<string, string> = {
  tr: "Analize eklememi onaylıyor musun?",
  en: "Want me to add this to analytics?",
  de: "Soll ich das zur Analyse hinzufügen?",
  es: "¿Lo añado a tu analítica?",
  fr: "Je l’ajoute à tes analyses ?",
  ar: "أضيف هذا إلى التحليل؟",
};

function localePrefix(locale: string): string {
  const prefix = locale.trim().toLowerCase().split(/[-_]/)[0] ?? "en";
  return prefix in ASK_BY_LOCALE ? prefix : "en";
}

export function mealSaveAsk(locale: string): string {
  return ASK_BY_LOCALE[localePrefix(locale)] ?? ASK_BY_LOCALE.en;
}

export function mentionsSaveAsk(text: string): boolean {
  return ASK_RE.test(text);
}

export function shouldAskMayaMealSave(input: {
  coachId: CoachId | string;
  intent?: Intent | string;
  userMessage?: string;
}): boolean {
  if (input.coachId !== "maya") return false;
  if (looksLikeFoodConsumption(input.userMessage ?? "")) return true;
  return input.intent === "meal_analysis";
}

export function ensureMayaMealSaveAsk(input: {
  text: string;
  locale: string;
  coachId: CoachId | string;
  intent?: Intent | string;
  userMessage?: string;
}): string {
  const text = input.text.trim();
  if (!text) return input.text;
  if (isCoachRetryLine(text)) return input.text;
  if (!shouldAskMayaMealSave(input)) return input.text;
  if (mentionsSaveAsk(text)) return input.text;
  const locale =
    looksLikeTurkishChat(input.userMessage ?? "") || looksLikeTurkishChat(text)
      ? "tr"
      : input.locale;
  return `${text}\n\n${mealSaveAsk(locale)}`;
}
