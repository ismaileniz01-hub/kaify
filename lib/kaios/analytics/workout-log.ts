/**
 * Workout-complete detection — shared by intent routing and analytics patches.
 * Kept free of CoachId imports to avoid intent ↔ chat-log cycles.
 */

const WORKOUT_DONE_RE =
  /(?:antrenman(?:[ıi])?|workout|session|gym|spor(?:u)?|salon(?:u)?)\s*(?:mı\s+)?(?:bitirdim|tamamladım|tamamladim|yaptım|yaptim|bitti)|(?:bitirdim|tamamladım|tamamladim|finished|completed)\s+(?:(?:the|my|a)\s+)?(?:antrenman|workout|session|gym|spor)|(?:i(?:['’]ve| have)?\s+)?(?:just\s+)?(?:finished|completed|done)\s+(?:(?:a|my|the)\s+)?(?:workout|session|gym)|workout\s+done|log(?:ged)?(?:\s+my)?\s+workout|salondan\s+ç[ıi]kt[ıi]m/i;

const SESSION_DONE_SHORT_RE =
  /^(?:today(?:['’]s| is)? done|done for today|i(?:['’]m| am) done(?: for today)?|bugün (?:bitti|tamam|bitirdim|oldu)|bitti(?:\s+bugün)?|session done|gym done)[\s!.?…]*$/iu;

export function looksLikeWorkoutCompletion(message: string): boolean {
  const msg = message.trim();
  if (!msg) return false;
  if (WORKOUT_DONE_RE.test(msg)) return true;
  return msg.length <= 48 && SESSION_DONE_SHORT_RE.test(msg);
}

export function parseWorkoutCompletion(
  message: string,
): { workoutsCompleted: number; caloriesBurned?: number } | null {
  if (!looksLikeWorkoutCompletion(message)) return null;
  const count = message.match(
    /(\d+)\s*(?:antrenman|workouts?|sessions?|seans)/i,
  );
  let workoutsCompleted = 1;
  if (count?.[1]) {
    const n = Number.parseInt(count[1], 10);
    if (n >= 1 && n <= 5) workoutsCompleted = n;
  }
  const burned = message.match(
    /(\d{2,4})\s*(?:kcal|kalori).{0,16}(?:yak|burn)|(?:yak|burn).{0,16}(\d{2,4})\s*(?:kcal|kalori)/i,
  );
  const caloriesBurned = burned
    ? Number.parseInt(burned[1] || burned[2] || "", 10)
    : NaN;
  return {
    workoutsCompleted,
    ...(Number.isFinite(caloriesBurned) && caloriesBurned >= 20
      ? { caloriesBurned }
      : {}),
  };
}

function parseMinutes(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.match(
    /(\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*(?:dk|dakika|min(?:ute)?s?)\b/i,
  );
  if (!m?.[1]) return null;
  const lo = Number.parseFloat(m[1].replace(",", "."));
  const hi = m[2] ? Number.parseFloat(m[2].replace(",", ".")) : lo;
  if (!Number.isFinite(lo)) return null;
  const mid = Number.isFinite(hi) ? (lo + hi) / 2 : lo;
  if (mid < 3 || mid > 90) return null;
  return mid;
}

function isCardioExercise(name: string, notes?: string): boolean {
  return /cardio|walk|incline|bike|cycle|rower|row\b|run|jog|hiit|zone\s*2|koşu|kosu|yürüyüş|yuruyus|bisiklet|ip\s*atlama|jump\s*rope/i.test(
    `${name} ${notes ?? ""}`,
  );
}

function metKcal(met: number, kg: number, minutes: number): number {
  return ((met * 3.5 * kg) / 200) * minutes;
}

export type WorkoutPlanForBurn = {
  days?: Array<{
    focusKey?: string;
    dayKey?: string;
    name?: string;
    focus?: string;
    title?: string;
    exercises?: Array<{
      name?: string;
      sets?: number;
      reps?: string | number;
      notes?: string;
    }>;
  }>;
  exercises?: Array<{
    name?: string;
    sets?: number;
    reps?: string | number;
    notes?: string;
  }>;
  durationMin?: number;
};

function daySearchText(day: NonNullable<WorkoutPlanForBurn["days"]>[number]): string {
  return [day.focus, day.name, day.title, day.focusKey, day.dayKey]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/workout\./g, "")
    .replace(/_/g, " ");
}

export function pickSessionExercises(
  plan: WorkoutPlanForBurn,
  hint?: string,
): NonNullable<WorkoutPlanForBurn["exercises"]> {
  if (Array.isArray(plan.exercises) && plan.exercises.length > 0) {
    return plan.exercises;
  }
  const days = (plan.days ?? []).filter(
    (day) => Array.isArray(day.exercises) && day.exercises.length > 0,
  );
  if (days.length === 0) return [];
  const needle = hint?.toLowerCase() ?? "";
  if (needle) {
    const match = days.find((day) => {
      const label = daySearchText(day);
      if (!label) return false;
      return label.split(/[\s/|,-]+/).some(
        (token) => token.length >= 3 && needle.includes(token),
      );
    });
    if (match?.exercises) return match.exercises;
  }
  return days[0]?.exercises ?? [];
}

/** Burn from the session they were given — never a stock 400. */
export function estimateCaloriesFromWorkoutPlan(
  plan: WorkoutPlanForBurn | null | undefined,
  weightKg: number | null | undefined,
  hint?: string,
): number | null {
  if (!plan) return null;
  const exercises = pickSessionExercises(plan, hint);
  if (exercises.length === 0 && !(plan.durationMin && plan.durationMin >= 10)) {
    return null;
  }

  const kg =
    weightKg != null && weightKg >= 40 && weightKg <= 250 ? weightKg : 75;

  let liftSets = 0;
  let cardioMin = 0;
  for (const ex of exercises) {
    const name = String(ex.name ?? "");
    const notes = String(ex.notes ?? "");
    const reps = String(ex.reps ?? "");
    if (isCardioExercise(name, `${notes} ${reps}`)) {
      cardioMin += parseMinutes(reps) ?? parseMinutes(notes) ?? 15;
      continue;
    }
    const sets = Number(ex.sets);
    liftSets += Number.isFinite(sets) && sets > 0 ? Math.min(8, sets) : 3;
  }

  const liftMin = liftSets * 2.5;
  const totalMin =
    plan.durationMin && plan.durationMin >= 10
      ? plan.durationMin
      : liftMin + cardioMin;
  if (totalMin < 8) return null;

  const liftShare = totalMin - cardioMin;
  const kcal = Math.round(
    metKcal(6, kg, Math.max(0, liftShare)) + metKcal(8, kg, cardioMin),
  );
  if (kcal < 50 || kcal > 1500) return null;
  return kcal;
}

/** Coach or user named a burn number in prose. */
export function parseCaloriesBurnedFromText(text: string): number | null {
  if (!text.trim()) return null;
  const m = text.match(
    /(?:yaklaşık|yaklasik|about|around|≈|~)?\s*(\d{2,4})\s*(?:kcal|kalori).{0,20}(?:yak|burn)|(?:yak|burn).{0,20}(\d{2,4})\s*(?:kcal|kalori)|(?:kcal|kalori)\s*[:：]?\s*(\d{2,4})/i,
  );
  const n = Number.parseInt(m?.[1] || m?.[2] || m?.[3] || "", 10);
  if (!Number.isFinite(n) || n < 50 || n > 1500) return null;
  return n;
}
