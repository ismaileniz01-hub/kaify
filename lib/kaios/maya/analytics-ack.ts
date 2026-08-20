/**
 * After a real analytics write, tell them it landed — one short line.
 */

const ACK: Record<string, { meal: string; water: string; both: string }> = {
  tr: {
    meal: "Öğünü analize ekledim.",
    water: "Suyu analize işledim.",
    both: "Öğün ve su analize işlendi.",
  },
  en: {
    meal: "Logged that meal to analytics.",
    water: "Logged that water to analytics.",
    both: "Meal and water are on analytics.",
  },
};

function localePrefix(locale: string): keyof typeof ACK {
  const prefix = locale.trim().toLowerCase().split(/[-_]/)[0] ?? "en";
  return prefix in ACK ? (prefix as keyof typeof ACK) : "en";
}

export function ensureMayaAnalyticsSavedAck(input: {
  text: string;
  locale: string;
  coachId: string;
  mealSaved?: boolean;
  waterSaved?: boolean;
}): string {
  if (input.coachId !== "maya") return input.text;
  const text = input.text.trim();
  if (!text) return input.text;
  if (!input.mealSaved && !input.waterSaved) return input.text;
  if (/\banaliz(?:e|e)?\b/i.test(text) && /\b(ekledim|işledim|isledim|logged)\b/i.test(text)) {
    return input.text;
  }
  const copy = ACK[localePrefix(input.locale)] ?? ACK.en;
  const line =
    input.mealSaved && input.waterSaved
      ? copy.both
      : input.mealSaved
        ? copy.meal
        : copy.water;
  return `${text}\n\n${line}`;
}
