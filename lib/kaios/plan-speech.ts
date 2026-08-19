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

export type NormalizedWorkoutExercise = {
  name: string;
  sets?: string;
  reps?: string;
  notes?: string;
};

export type NormalizedWorkoutDay = {
  day: string;
  focus: string;
  exercises: NormalizedWorkoutExercise[];
};

export function extractWorkoutDays(ui: unknown): PlanDay[] {
  const rec = asRecord(ui);
  if (!rec) return [];
  const nested = asRecord(rec.ui) ?? rec;
  const data = asRecord(rec.data);
  const days = nested.days ?? data?.days;
  if (!Array.isArray(days)) return [];
  return days.filter((day): day is PlanDay => Boolean(asRecord(day)));
}

const WEEKDAYS =
  "Pazartesi|Salı|Sali|Çarşamba|Carsamba|Perşembe|Persembe|Cuma|Cumartesi|Pazar|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday";

const SETS_REPS =
  "(\\d+)\\s*[x×]\\s*([0-9]+(?:\\s*-\\s*[0-9]+)?|[0-9]+\\+?|failure|amrap|min)";

function stripSpeechDecor(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

function parseExerciseLine(raw: string): PlanExercise | null {
  const line = stripSpeechDecor(raw).replace(/^[-•*]+\s+/, "").replace(/^\d+[.)]\s+/, "");
  const match = line.match(new RegExp(`^(.+?)\\s+${SETS_REPS}$`, "i"));
  if (!match) return null;
  const name = match[1]!.trim();
  if (!name) return null;
  return {
    name,
    sets: Number(match[2]),
    reps: match[3]!.replace(/\s+/g, ""),
  };
}

function normalizeExercise(raw: unknown): NormalizedWorkoutExercise | null {
  if (typeof raw === "string") {
    const parsed = parseExerciseLine(raw);
    if (parsed?.name) {
      return {
        name: parsed.name,
        sets: parsed.sets != null ? String(parsed.sets) : undefined,
        reps: parsed.reps != null ? String(parsed.reps) : undefined,
      };
    }
    const name = raw.trim();
    return name ? { name } : null;
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  const name = stringish(rec.name, rec.exercise, rec.exercise_name, rec.title);
  if (!name) return null;
  const sets =
    rec.sets != null && String(rec.sets).trim() ? String(rec.sets).trim() : undefined;
  const reps =
    rec.reps != null && String(rec.reps).trim() ? String(rec.reps).trim() : undefined;
  const notes = stringish(rec.notes, rec.cue, rec.cues) || undefined;
  return { name, sets, reps, notes };
}

export function normalizeWorkoutDays(days: PlanDay[]): NormalizedWorkoutDay[] {
  return days
    .map((day) => {
      const heading = stringish(day.dayKey, day.day);
      const focus = stringish(day.focus, day.focusKey, day.name, day.title);
      const dayLabel = heading || focus;
      const exercises = (day.exercises ?? [])
        .map((ex) => normalizeExercise(ex))
        .filter((ex): ex is NormalizedWorkoutExercise => Boolean(ex));
      return {
        day: dayLabel,
        focus: heading && focus && heading !== focus ? focus : heading ? focus : "",
        exercises,
      };
    })
    .filter((day) => day.exercises.length > 0 && Boolean(day.day));
}

/** Recover a weekly split from spoken coach text when ui.days is missing. */
export function parseWorkoutDaysFromSpeech(text: string): PlanDay[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripSpeechDecor(line.trim()))
    .filter(Boolean);

  const dayRe = new RegExp(`^(${WEEKDAYS})\\s*[–—\\-:]+\\s*(.+)$`, "i");
  const dayOnlyRe = new RegExp(`^(${WEEKDAYS})$`, "i");
  const gunRe = /^(?:Gün|Gun|Day)\s*(\d+)\s*[–—\-:]+\s*(.+)$/i;
  const gunOnlyRe = /^(?:Gün|Gun|Day)\s*(\d+)$/i;
  const bulletExRe = new RegExp(`^(?:[-•*]|\\d+[.)])\\s+(.+?)\\s+${SETS_REPS}$`, "i");
  const bareExRe = new RegExp(`^(.+?)\\s+${SETS_REPS}$`, "i");

  const days: PlanDay[] = [];
  let current: PlanDay | null = null;

  const startDay = (dayKey: string, focus: string) => {
    current = { dayKey, focus, exercises: [] };
    days.push(current);
  };

  for (const line of lines) {
    const dayMatch = line.match(dayRe) ?? line.match(dayOnlyRe);
    if (dayMatch && !bulletExRe.test(line)) {
      startDay(dayMatch[1]!, (dayMatch[2] ?? "").trim());
      continue;
    }
    const gunMatch = line.match(gunRe) ?? line.match(gunOnlyRe);
    if (gunMatch) {
      startDay(`Gün ${gunMatch[1]}`, (gunMatch[2] ?? "").trim());
      continue;
    }
    if (!current) continue;
    const exMatch = line.match(bulletExRe) ?? line.match(bareExRe);
    if (!exMatch) continue;
    current.exercises = current.exercises ?? [];
    current.exercises.push({
      name: exMatch[1]!.trim(),
      sets: Number(exMatch[2]),
      reps: exMatch[3]!.replace(/\s+/g, ""),
    });
  }

  return days.filter((day) => (day.exercises?.length ?? 0) > 0);
}

export function resolveWorkoutPlanDays(
  payload: unknown,
  fallbackText?: string,
): NormalizedWorkoutDay[] {
  const fromPayload = normalizeWorkoutDays(extractWorkoutDays(payload));
  if (fromPayload.length > 0) return fromPayload;
  if (!fallbackText?.trim()) return [];
  return normalizeWorkoutDays(parseWorkoutDaysFromSpeech(fallbackText));
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
