import {
  isUsableCoachReply,
  sanitizeCoachVisibleText,
} from "@/lib/kaios/coach-retry";
import { resolveLocale } from "@/lib/i18n/dictionary";
import type { TechnicalAnalysis } from "@/lib/validations/analysis.schema";

/**
 * When DeepSeek synthesis is wiped as a leak/retry, still show Gemini macros
 * instead of "I didn't catch that" — the plate was already read.
 */
export function fallbackPhotoSummaryFromAnalysis(
  analysis: TechnicalAnalysis,
  locale: string,
  kind: "food" | "body",
): string {
  const loc = resolveLocale(locale).split("-")[0] ?? "en";
  const food = analysis.food_analysis;
  if (kind === "food") {
    if (food && (food.calories > 0 || food.protein > 0 || food.carb > 0 || food.fat > 0)) {
      const cal = Math.round(food.calories);
      const protein = Math.round(food.protein);
      const carb = Math.round(food.carb);
      const fat = Math.round(food.fat);
      if (loc === "tr") {
        return `Bu öğünde kabaca ${cal} kcal, ${protein}g protein, ${carb}g karbonhidrat ve ${fat}g yağ görünüyor.`;
      }
      return `This plate looks like about ${cal} kcal, ${protein}g protein, ${carb}g carbs, and ${fat}g fat.`;
    }
    const hint = analysis.ambiguity.find((item) => item.trim().length > 0);
    if (loc === "tr") {
      return hint
        ? `Tabağı net göremedim: ${hint}. Daha yakın ve aydınlık bir fotoğraf dener misin?`
        : "Tabağı net göremedim. Daha yakın ve aydınlık bir fotoğraf dener misin?";
    }
    return hint
      ? `I couldn't read that plate clearly (${hint}). Try a closer, brighter photo?`
      : "I couldn't read that plate clearly. Try a closer, brighter photo?";
  }

  const overall = Math.round(analysis.overall_score);
  const visible = analysis.visible_muscles.slice(0, 4).join(", ");
  if (loc === "tr") {
    return visible
      ? `Görünen bölgeler: ${visible}. Genel skor ${overall}.`
      : `Görünen vücut bölgelerine göre genel skor ${overall}.`;
  }
  return visible
    ? `Visible regions: ${visible}. Overall score ${overall}.`
    : `Overall score from the visible regions is ${overall}.`;
}

/** Keep a usable synthesis, else a deterministic summary from Gemini numbers. */
export function resolvePhotoCoachSummary(input: {
  summary: string;
  locale: string;
  coachId: "maya" | "leo";
  kind: "food" | "body";
  analysis: TechnicalAnalysis;
}): string {
  const sanitized = sanitizeCoachVisibleText(
    input.summary,
    input.locale,
    input.coachId,
  );
  if (isUsableCoachReply(sanitized)) return sanitized;
  if (isUsableCoachReply(input.summary)) return input.summary;
  return fallbackPhotoSummaryFromAnalysis(
    input.analysis,
    input.locale,
    input.kind,
  );
}
