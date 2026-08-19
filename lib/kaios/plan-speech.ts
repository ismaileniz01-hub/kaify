/**
 * Structured plans must stay readable in the chat bubble.
 * Cards are extra — never the only place days/meals live.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringish(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export type PlanExercise = {
  name?: string;
  sets?: number | string;
  reps?: string | number;
  notes?: string;
};

export type PlanDay = {
  dayKey?: string;
  day?: string;
  name?: string;
  title?: string;
  focus?: string;
  focusKey?: string;
  exercises?: PlanExercise[];
};

export type MealItem = { name?: string; calories?: number };
export type MealBlock = {
  labelKey?: string;
  label?: string;
  name?: string;
  items?: MealItem[];
};

export function extractWorkoutDays(ui: unknown): PlanDay[] {
  const rec = asRecord(ui);
  if (!rec) return [];
  const nested = asRecord(rec.ui) ?? rec;
  const days = nested.days;
  if (!Array.isArray(days)) return [];
  return days.filter((day): day is PlanDay => Boolean(asRecord(day)));
}

export function extractMealBlocks(ui: unknown): MealBlock[] {
  const rec = asRecord(ui);
  if (!rec) return [];
  const nested = asRecord(rec.ui) ?? rec;
  const data = asRecord(rec.data);
  const meals = nested.meals ?? data?.meals;
  if (!Array.isArray(meals)) return [];
  return meals.filter((meal): meal is MealBlock => Boolean(asRecord(meal)));
}

function dayLabel(day: PlanDay): string {
  return stringish(day.dayKey, day.day, day.name, day.title);
}

function focusLabel(day: PlanDay): string {
  return stringish(day.focus, day.focusKey);
}

export function formatWorkoutPlanSpeech(days: PlanDay[]): string {
  const lines: string[] = [];
  for (const day of days) {
    const heading = [dayLabel(day), focusLabel(day)].filter(Boolean).join(" — ");
    if (heading) lines.push(heading);
    for (const ex of day.exercises ?? []) {
      const name = stringish(ex.name);
      if (!name) continue;
      const sets = ex.sets != null && String(ex.sets).trim() ? String(ex.sets) : "";
      const reps = ex.reps != null && String(ex.reps).trim() ? String(ex.reps) : "";
      const load = sets && reps ? ` ${sets}x${reps}` : sets ? ` ${sets}` : "";
      lines.push(`• ${name}${load}`);
    }
  }
  return lines.join("\n");
}

export function formatMealPlanSpeech(meals: MealBlock[]): string {
  const lines: string[] = [];
  for (const meal of meals) {
    const heading = stringish(meal.label, meal.name, meal.labelKey);
    if (heading) lines.push(heading);
    for (const item of meal.items ?? []) {
      const name = stringish(item.name);
      if (!name) continue;
      const kcal =
        typeof item.calories === "number" && Number.isFinite(item.calories)
          ? ` ${item.calories} kcal`
          : "";
      lines.push(`• ${name}${kcal}`);
    }
  }
  return lines.join("\n");
}

function mentionsEnough(message: string, needles: string[], minHits: number): boolean {
  const lower = message.toLocaleLowerCase();
  let hits = 0;
  for (const needle of needles) {
    const n = needle.trim().toLocaleLowerCase();
    if (n.length < 3) continue;
    if (lower.includes(n)) hits += 1;
  }
  return hits >= minHits;
}

export function workoutSpeechMissingDays(message: string, days: PlanDay[]): boolean {
  if (days.length === 0) return false;
  const dayNeedles = days.map((d) => dayLabel(d) || focusLabel(d)).filter(Boolean);
  const exerciseNeedles = days.flatMap((d) =>
    (d.exercises ?? []).map((ex) => stringish(ex.name)),
  );
  const dayHitsNeeded = Math.min(2, dayNeedles.length);
  const exHitsNeeded = Math.min(3, exerciseNeedles.filter(Boolean).length);
  const hasDays = dayHitsNeeded === 0 || mentionsEnough(message, dayNeedles, dayHitsNeeded);
  const hasLifts = exHitsNeeded === 0 || mentionsEnough(message, exerciseNeedles, exHitsNeeded);
  return !(hasDays && hasLifts);
}

export function mealSpeechMissingMeals(message: string, meals: MealBlock[]): boolean {
  if (meals.length === 0) return false;
  const itemNeedles = meals.flatMap((m) =>
    (m.items ?? []).map((item) => stringish(item.name)),
  );
  const needed = Math.min(3, itemNeedles.filter(Boolean).length);
  if (needed === 0) return false;
  return !mentionsEnough(message, itemNeedles, needed);
}

export function ensureStructuredPlanVisible(input: {
  intent: string;
  message: string;
  ui?: unknown;
  data?: unknown;
}): string {
  const spoken = input.message.trim();
  if (!spoken) return spoken;

  if (input.intent === "programming") {
    const days = extractWorkoutDays(input.ui) ;
    const fromData = days.length > 0 ? days : extractWorkoutDays(input.data);
    if (fromData.length === 0 || !workoutSpeechMissingDays(spoken, fromData)) {
      return spoken;
    }
    const schedule = formatWorkoutPlanSpeech(fromData);
    return schedule ? `${spoken}\n\n${schedule}` : spoken;
  }

  if (input.intent === "meal_plan") {
    const meals = extractMealBlocks(input.ui);
    const fromData = meals.length > 0 ? meals : extractMealBlocks(input.data);
    if (fromData.length === 0 || !mealSpeechMissingMeals(spoken, fromData)) {
      return spoken;
    }
    const list = formatMealPlanSpeech(fromData);
    return list ? `${spoken}\n\n${list}` : spoken;
  }

  return spoken;
}
