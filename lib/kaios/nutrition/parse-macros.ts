/**
 * Deterministic macro extraction from Maya's coach text.
 * Used to offer analytics confirmation without a second LLM call.
 */

export type ParsedMealMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function parseNum(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Midpoint of a single value or a–b range. */
function parseValueOrRange(a: string, b?: string): number | null {
  const lo = parseNum(a);
  if (lo == null) return null;
  if (!b) return lo;
  const hi = parseNum(b);
  if (hi == null) return lo;
  return (lo + hi) / 2;
}

function labeledNumber(
  text: string,
  labels: string,
): number | null {
  const re = new RegExp(
    `(?:${labels})\\s*[:：]?\\s*(?:≈|~|yaklaşık|yaklasik|about|around|approx(?:imately)?)?\\s*(\\d+(?:[.,]\\d+)?)(?:\\s*[-–—]\\s*(\\d+(?:[.,]\\d+)?))?`,
    "i",
  );
  const m = text.match(re);
  if (!m?.[1]) return null;
  return parseValueOrRange(m[1], m[2]);
}

/**
 * Parse calories / protein / carbs / fat from a Maya-style macro breakdown.
 * Requires all four fields so daily protein targets are not logged as a meal.
 */
export function extractMealMacrosFromCoachText(
  text: string,
): ParsedMealMacros | null {
  const src = text.normalize("NFC");
  const calories =
    labeledNumber(src, "kalori(?:ler|ye)?|calories?|kalorije") ??
    (() => {
      const m = src.match(
        /(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*k(?:cal|kal)/i,
      );
      return m?.[1] ? parseValueOrRange(m[1], m[2]) : null;
    })();
  const protein = labeledNumber(src, "protein(?:e|i|s)?|proteini");
  const carbs = labeledNumber(
    src,
    "karbonhidrat(?:lar)?|carbohydrates?|carbs?|ugljikohidrat(?:i)?|ugljeni\\s*hidrat(?:i)?",
  );
  const fat = labeledNumber(src, "yağ|yag|fat|masti|masno[cć]a");

  return (
    finalizeMacros(calories, protein, carbs, fat) ?? extractCompactMacros(src)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function numField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function finalizeMacros(
  calories: number | null,
  protein: number | null,
  carbs: number | null,
  fat: number | null,
): ParsedMealMacros | null {
  if (calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }
  if (calories <= 0 || calories > 20_000) return null;
  if (protein < 0 || protein > 2_000) return null;
  if (carbs < 0 || carbs > 2_000) return null;
  if (fat < 0 || fat > 2_000) return null;
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/** 280 kcal · 4 P · 48 C · 8 F without full word labels. */
function extractCompactMacros(src: string): ParsedMealMacros | null {
  const m = src.match(
    /(\d+(?:[.,]\d+)?)\s*k(?:cal|kal)[\s\S]{0,160}?(\d+(?:[.,]\d+)?)\s*g?\s*(?:protein|proteini|p\b)[\s\S]{0,80}?(\d+(?:[.,]\d+)?)\s*g?\s*(?:karbonhidrat|carb|ugljikohidrat|c\b)[\s\S]{0,80}?(\d+(?:[.,]\d+)?)\s*g?\s*(?:yağ|yag|fat|masti|f\b)/i,
  );
  if (!m?.[1] || !m[2] || !m[3] || !m[4]) return null;
  return finalizeMacros(
    parseNum(m[1]),
    parseNum(m[2]),
    parseNum(m[3]),
    parseNum(m[4]),
  );
}

/** Macros from envelope data/ui when the spoken labels were non-Turkish. */
export function extractMealMacrosFromRecord(
  value: unknown,
): ParsedMealMacros | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const own = finalizeMacros(
    numField(rec.calories ?? rec.kcal),
    numField(rec.protein ?? rec.protein_g),
    numField(rec.carbs ?? rec.carbohydrates ?? rec.carbs_g ?? rec.karbonhidrat),
    numField(rec.fat ?? rec.fat_g),
  );
  if (own) return own;
  for (const key of ["macros", "meal", "nutrition", "analysis"] as const) {
    const nested = extractMealMacrosFromRecord(rec[key]);
    if (nested) return nested;
  }
  return null;
}
