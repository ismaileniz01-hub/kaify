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
    labeledNumber(src, "kalori(?:ler)?|calories?|kcal") ??
    (() => {
      const m = src.match(
        /(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*k(?:cal|kal)/i,
      );
      return m?.[1] ? parseValueOrRange(m[1], m[2]) : null;
    })();
  const protein = labeledNumber(src, "protein");
  const carbs = labeledNumber(
    src,
    "karbonhidrat(?:lar)?|carbohydrates?|carbs?",
  );
  const fat = labeledNumber(src, "yağ|yag|fat");

  if (
    calories == null ||
    protein == null ||
    carbs == null ||
    fat == null
  ) {
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
