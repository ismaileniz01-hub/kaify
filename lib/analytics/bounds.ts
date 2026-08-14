/**
 * Canonical numeric bounds for persisted analytics_daily fields.
 * Ceilings are corruption-prevention, not medical truth.
 */

export type AnalyticsNumericField =
  | "weight_kg"
  | "calories_consumed"
  | "calories_burned"
  | "calorie_goal"
  | "workouts_completed"
  | "workouts_target"
  | "water_liters"
  | "water_goal_liters"
  | "steps"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
  | "protein_goal_g"
  | "carbs_goal_g"
  | "fat_goal_g";

export type AnalyticsBound = {
  field: AnalyticsNumericField;
  nullable: boolean;
  min: number;
  max: number;
  zeroValid: boolean;
  units: string;
};

export const ANALYTICS_BOUNDS: readonly AnalyticsBound[] = [
  { field: "weight_kg", nullable: true, min: 20, max: 500, zeroValid: false, units: "kg" },
  { field: "calories_consumed", nullable: false, min: 0, max: 20_000, zeroValid: true, units: "kcal" },
  { field: "calories_burned", nullable: false, min: 0, max: 20_000, zeroValid: true, units: "kcal" },
  { field: "calorie_goal", nullable: false, min: 500, max: 20_000, zeroValid: false, units: "kcal" },
  { field: "workouts_completed", nullable: false, min: 0, max: 30, zeroValid: true, units: "count" },
  { field: "workouts_target", nullable: false, min: 0, max: 30, zeroValid: true, units: "count" },
  { field: "water_liters", nullable: false, min: 0, max: 30, zeroValid: true, units: "L" },
  { field: "water_goal_liters", nullable: false, min: 0.5, max: 30, zeroValid: false, units: "L" },
  { field: "steps", nullable: false, min: 0, max: 500_000, zeroValid: true, units: "steps" },
  { field: "protein_g", nullable: false, min: 0, max: 2_000, zeroValid: true, units: "g" },
  { field: "carbs_g", nullable: false, min: 0, max: 2_000, zeroValid: true, units: "g" },
  { field: "fat_g", nullable: false, min: 0, max: 2_000, zeroValid: true, units: "g" },
  { field: "protein_goal_g", nullable: false, min: 0, max: 2_000, zeroValid: true, units: "g" },
  { field: "carbs_goal_g", nullable: false, min: 0, max: 2_000, zeroValid: true, units: "g" },
  { field: "fat_goal_g", nullable: false, min: 0, max: 2_000, zeroValid: true, units: "g" },
] as const;

const BY_FIELD = new Map(ANALYTICS_BOUNDS.map((b) => [b.field, b]));

const PATCH_ALIASES: Record<string, AnalyticsNumericField> = {
  weight_kg: "weight_kg",
  weightKg: "weight_kg",
  calories_consumed: "calories_consumed",
  caloriesConsumed: "calories_consumed",
  calories_burned: "calories_burned",
  caloriesBurned: "calories_burned",
  calorie_goal: "calorie_goal",
  calorieGoal: "calorie_goal",
  workouts_completed: "workouts_completed",
  workoutsCompleted: "workouts_completed",
  workouts_target: "workouts_target",
  workoutsTarget: "workouts_target",
  water_liters: "water_liters",
  waterLiters: "water_liters",
  water_goal_liters: "water_goal_liters",
  waterGoalLiters: "water_goal_liters",
  steps: "steps",
  protein_g: "protein_g",
  proteinG: "protein_g",
  carbs_g: "carbs_g",
  carbsG: "carbs_g",
  fat_g: "fat_g",
  fatG: "fat_g",
  protein_goal_g: "protein_goal_g",
  carbs_goal_g: "carbs_goal_g",
  fat_goal_g: "fat_goal_g",
};

export function sanitizeAnalyticsNumber(
  field: AnalyticsNumericField,
  value: unknown,
): number | null | undefined {
  const bound = BY_FIELD.get(field);
  if (!bound) return undefined;
  if (value === null || value === undefined) {
    return bound.nullable ? null : undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (!bound.zeroValid && n === 0 && !bound.nullable) {
    return bound.min;
  }
  return Math.min(bound.max, Math.max(bound.min, n));
}

/** Drops NaN/Infinity and clamps known numeric keys. Unknown keys pass through. */
export function sanitizeAnalyticsPatch(
  patch: Record<string, unknown> | null | undefined,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  if (!patch) return out;
  for (const [key, raw] of Object.entries(patch)) {
    const field = PATCH_ALIASES[key];
    if (!field) continue;
    const sanitized = sanitizeAnalyticsNumber(field, raw);
    if (sanitized === undefined) continue;
    const canonical = ANALYTICS_BOUNDS.find((b) => b.field === field)!.field;
    out[canonical] = sanitized;
  }
  return out;
}

export function sanitizeMealMacros(meal: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): { calories: number; protein: number; carbs: number; fat: number } {
  return {
    calories: sanitizeAnalyticsNumber("calories_consumed", meal.calories) ?? 0,
    protein: sanitizeAnalyticsNumber("protein_g", meal.protein) ?? 0,
    carbs: sanitizeAnalyticsNumber("carbs_g", meal.carbs) ?? 0,
    fat: sanitizeAnalyticsNumber("fat_g", meal.fat) ?? 0,
  };
}
