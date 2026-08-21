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

function labeledNumber(text: string, labels: string): number | null {
  const re = new RegExp(
    `(?:${labels})\\s*[:：]?\\s*(?:≈|~|yaklaşık|yaklasik|about|around|approx(?:imately)?)?\\s*(\\d+(?:[.,]\\d+)?)(?:\\s*[-–—]\\s*(\\d+(?:[.,]\\d+)?))?`,
    "i",
  );
  const m = text.match(re);
  if (!m?.[1]) return null;
  return parseValueOrRange(m[1], m[2]);
}

function numberBeforeLabel(text: string, labels: string): number | null {
  const re = new RegExp(
    `(\\d+(?:[.,]\\d+)?)(?:\\s*[-–—]\\s*(\\d+(?:[.,]\\d+)?))?\\s*(?:g|gr|gram)?\\s*(?:${labels})\\b`,
    "i",
  );
  const m = text.match(re);
  if (!m?.[1]) return null;
  return parseValueOrRange(m[1], m[2]);
}

function kcalIn(text: string): number | null {
  const m = text.match(
    /(?:≈|~|yaklaşık|yaklasik|about|around)?\s*(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*k(?:cal|kal)/i,
  );
  return m?.[1] ? parseValueOrRange(m[1], m[2]) : null;
}

/**
 * Prefer "Toplam / Total" lines so per-item ~350 kcal does not steal the meal total.
 */
function extractFromTotalsLine(src: string): {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
} {
  const block =
    src.match(
      /(?:toplam(?:\s+tahmini)?|estimated\s+total|total(?:\s+estimat(?:ed|e))?)[^\n]{0,220}/i,
    )?.[0] ?? "";
  if (!block) {
    return { calories: null, protein: null, carbs: null, fat: null };
  }
  return {
    calories: kcalIn(block),
    protein:
      labeledNumber(block, "protein(?:e|i|s)?|proteini") ??
      numberBeforeLabel(block, "protein(?:e|i|s)?|proteini"),
    carbs:
      labeledNumber(
        block,
        "karbonhidrat(?:lar)?|carbohydrates?|carbs?",
      ) ??
      numberBeforeLabel(block, "karbonhidrat(?:lar)?|carbohydrates?|carbs?"),
    fat:
      labeledNumber(block, "yağ|yag|fat") ??
      numberBeforeLabel(block, "yağ|yag|fat"),
  };
}

/**
 * When Maya lists kcal + protein but skips carbs/fat (common), fill the remainder
 * so a confirm card can still be offered. Split leftover kcal ~55% carbs / 45% fat.
 */
export function fillMissingCarbsFat(
  calories: number,
  protein: number,
  carbs: number | null,
  fat: number | null,
): { carbs: number; fat: number } | null {
  if (carbs != null && fat != null) {
    return { carbs: Math.round(carbs), fat: Math.round(fat) };
  }
  const proteinKcal = Math.max(0, protein * 4);
  const rem = Math.max(0, calories - proteinKcal);
  if (carbs != null && fat == null) {
    const carbsKcal = Math.max(0, carbs * 4);
    const fatEst = Math.round(Math.max(0, rem - carbsKcal) / 9);
    return { carbs: Math.round(carbs), fat: fatEst };
  }
  if (fat != null && carbs == null) {
    const fatKcal = Math.max(0, fat * 9);
    const carbsEst = Math.round(Math.max(0, rem - fatKcal) / 4);
    return { carbs: carbsEst, fat: Math.round(fat) };
  }
  const carbsEst = Math.round((rem * 0.55) / 4);
  const fatEst = Math.round((rem * 0.45) / 9);
  return { carbs: carbsEst, fat: fatEst };
}

/**
 * Parse calories / protein / carbs / fat from a Maya-style macro breakdown.
 * Requires calories + protein at minimum; carbs/fat may be estimated from remainder.
 */
export function extractMealMacrosFromCoachText(
  text: string,
): ParsedMealMacros | null {
  const src = text.normalize("NFC");
  const fromTotal = extractFromTotalsLine(src);

  const calories =
    fromTotal.calories ??
    labeledNumber(src, "kalori(?:ler|ye)?|calories?|kalorije") ??
    kcalIn(src);
  const protein =
    fromTotal.protein ??
    labeledNumber(src, "protein(?:e|i|s)?|proteini") ??
    numberBeforeLabel(src, "protein(?:e|i|s)?|proteini");
  let carbs =
    fromTotal.carbs ??
    labeledNumber(
      src,
      "karbonhidrat(?:lar)?|carbohydrates?|carbs?|ugljikohidrat(?:i)?|ugljeni\\s*hidrat(?:i)?",
    );
  let fat =
    fromTotal.fat ?? labeledNumber(src, "yağ|yag|fat|masti|masno[cć]a");

  if (calories != null && protein != null && (carbs == null || fat == null)) {
    const compact = extractCompactMacros(src);
    if (compact) return compact;
    const filled = fillMissingCarbsFat(calories, protein, carbs, fat);
    if (filled) {
      carbs = filled.carbs;
      fat = filled.fat;
    }
  }

  return finalizeMacros(calories, protein, carbs, fat);
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
  let calories = numField(rec.calories ?? rec.kcal);
  let protein = numField(rec.protein ?? rec.protein_g);
  let carbs = numField(
    rec.carbs ??
      rec.carb ??
      rec.carbohydrates ??
      rec.carbs_g ??
      rec.carb_g ??
      rec.karbonhidrat,
  );
  let fat = numField(rec.fat ?? rec.fat_g);
  if (calories != null && protein != null && (carbs == null || fat == null)) {
    const filled = fillMissingCarbsFat(calories, protein, carbs, fat);
    if (filled) {
      carbs = filled.carbs;
      fat = filled.fat;
    }
  }
  const own = finalizeMacros(calories, protein, carbs, fat);
  if (own) return own;
  for (const key of [
    "macros",
    "meal",
    "nutrition",
    "analysis",
    "food_analysis",
  ] as const) {
    const nested = extractMealMacrosFromRecord(rec[key]);
    if (nested) return nested;
  }
  return null;
}
