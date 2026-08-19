/**
 * Pure helpers so a new local day does not wipe last-known weight, goals,
 * or this week's workout count on the analytics dashboard.
 */

export type DailySnapshotLike = {
  weightKg: number | null;
  calorieGoal: number;
  workoutsCompleted: number;
  workoutsTarget: number;
  waterGoalLiters: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
};

export type LastKnownGoals = {
  calorieGoal?: number | null;
  workoutsTarget?: number | null;
  waterGoalLiters?: number | null;
  proteinGoalG?: number | null;
  carbsGoalG?: number | null;
  fatGoalG?: number | null;
};

function finitePositive(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/** YYYY-MM-DD keys for the last `days` local calendar days ending at `today`. */
export function localDateKeysEnding(today: string, days = 7): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(`${today}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export function sumWeekWorkouts(
  history: Array<{ workoutsCompleted?: number | null }>,
): number {
  return history.reduce(
    (sum, day) => sum + (Number(day.workoutsCompleted) || 0),
    0,
  );
}

/**
 * Fill today's dashboard snapshot without inventing meals or sessions.
 * Weight/goals carry forward; today's eaten/burned/workouts stay at 0 until logged.
 */
export function hydrateTodaySnapshot<T extends DailySnapshotLike>(
  today: T,
  input: {
    hasTodayRow: boolean;
    lastWeightKg?: number | null;
    lastGoals?: LastKnownGoals | null;
  },
): T {
  const lastWeight = finitePositive(input.lastWeightKg ?? null);
  const goals = input.lastGoals ?? {};
  const next = { ...today, weightKg: today.weightKg ?? lastWeight };

  if (!input.hasTodayRow) {
    const calorieGoal = finitePositive(goals.calorieGoal ?? null);
    const workoutsTarget = finitePositive(goals.workoutsTarget ?? null);
    const waterGoal = finitePositive(goals.waterGoalLiters ?? null);
    const proteinGoal = finitePositive(goals.proteinGoalG ?? null);
    const carbsGoal = finitePositive(goals.carbsGoalG ?? null);
    const fatGoal = finitePositive(goals.fatGoalG ?? null);
    if (calorieGoal != null) next.calorieGoal = Math.round(calorieGoal);
    if (workoutsTarget != null) next.workoutsTarget = Math.round(workoutsTarget);
    if (waterGoal != null) next.waterGoalLiters = waterGoal;
    if (proteinGoal != null) next.proteinGoalG = Math.round(proteinGoal);
    if (carbsGoal != null) next.carbsGoalG = Math.round(carbsGoal);
    if (fatGoal != null) next.fatGoalG = Math.round(fatGoal);
  }

  return next;
}
