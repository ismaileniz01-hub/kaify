/**
 * Maya must label macros in the active app locale.
 * The food-log capsule used to hardcode Kalori/Yağ, so English chats
 * still streamed Turkish labels — this rewrites list labels after the model.
 */

type MacroLabels = {
  calories: string;
  carbs: string;
  fat: string;
  total: string;
};

const LABELS: Record<string, MacroLabels> = {
  en: { calories: "Calories", carbs: "Carbs", fat: "Fat", total: "Total" },
  tr: { calories: "Kalori", carbs: "Karbonhidrat", fat: "Yağ", total: "Toplam" },
  de: { calories: "Kalorien", carbs: "Kohlenhydrate", fat: "Fett", total: "Gesamt" },
  es: { calories: "Calorías", carbs: "Carbohidratos", fat: "Grasa", total: "Total" },
  fr: { calories: "Calories", carbs: "Glucides", fat: "Lipides", total: "Total" },
  ar: { calories: "السعرات", carbs: "الكربوهيدرات", fat: "الدهون", total: "المجموع" },
};

const CALORIE_ALIASES = "Kalori(?:ler)?|Calories|Kalorien|Calor[ií]as";
const CARB_ALIASES =
  "Karbonhidrat(?:lar)?|Carbohydrates?|Carbs|Kohlenhydrate|Carbohidratos|Glucides";
const FAT_ALIASES = "Ya[gğ]|Fat|Fett|Grasa|Lipides";
const TOTAL_ALIASES = "Toplam(?:\\s+tahmini)?|Estimated\\s+total|Total(?:\\s+estimate)?|Gesamt";

function localePrefix(locale: string): string {
  const prefix = locale.trim().toLowerCase().split(/[-_]/)[0] ?? "en";
  return prefix in LABELS ? prefix : "en";
}

function replaceLabeled(
  text: string,
  aliases: string,
  target: string,
): string {
  const re = new RegExp(`(^|[\\n•·\\-–—*])(\\s*)(?:${aliases})\\s*:`, "gim");
  return text.replace(re, `$1$2${target}:`);
}

export function relabelMayaMacroLabels(input: {
  text: string;
  locale: string;
  coachId?: string;
}): string {
  if (input.coachId && input.coachId !== "maya") return input.text;
  const text = input.text;
  if (!text.trim()) return input.text;
  const labels = LABELS[localePrefix(input.locale)] ?? LABELS.en;
  let out = replaceLabeled(text, CALORIE_ALIASES, labels.calories);
  out = replaceLabeled(out, CARB_ALIASES, labels.carbs);
  out = replaceLabeled(out, FAT_ALIASES, labels.fat);
  out = replaceLabeled(out, TOTAL_ALIASES, labels.total);
  return out;
}
