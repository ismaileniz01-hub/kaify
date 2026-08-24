export const KCAL_PER_KG = 7700;
const WEEKLY_KG_ESTIMATE_CAP = 2;

export type WeeklyEnergyDay = {
  date?: string;
  caloriesConsumed?: number | null;
  /** Workout calories only; maintenance is deliberately separate. */
  caloriesBurned?: number | null;
  calorieGoal?: number | null;
  maintenanceCalories?: number | null;
  /** Explicit meal-presence signal from persisted nutrition fields. */
  foodLogged?: boolean;
};

export type WeeklyEnergySummary = {
  budgetTargetToDate: number;
  consumed: number;
  remaining: number;
  over: number;
  energyBurned: number;
  energyBalance: number;
  loggedDays: number;
  elapsedDays: number;
  /** Only available after >=4 complete elapsed days. Negative means estimated loss. */
  estimatedWeightChangeKg: number | null;
};

function kcal(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function summarizeWeeklyEnergy(
  history: WeeklyEnergyDay[] | null | undefined,
  fallback: {
    calorieGoal: number;
    maintenanceCalories: number | null | undefined;
  },
): WeeklyEnergySummary {
  const days = history ?? [];
  const fallbackGoal = kcal(fallback.calorieGoal) || 2100;
  const fallbackMaintenance =
    kcal(fallback.maintenanceCalories) || fallbackGoal;

  let budgetTargetToDate = 0;
  let consumed = 0;
  let energyBurned = 0;
  let loggedDays = 0;

  for (const day of days) {
    const dayConsumed = kcal(day.caloriesConsumed);
    const workout = kcal(day.caloriesBurned);
    budgetTargetToDate += kcal(day.calorieGoal) || fallbackGoal;
    const hasFoodLog = day.foodLogged ?? dayConsumed > 0;
    if (!hasFoodLog) continue;
    loggedDays += 1;
    energyBurned +=
      (kcal(day.maintenanceCalories) || fallbackMaintenance) + workout;
  }

  consumed = Math.round(
    days.reduce((sum, day) => sum + kcal(day.caloriesConsumed), 0),
  );
  budgetTargetToDate = Math.round(budgetTargetToDate);
  energyBurned = Math.round(energyBurned);
  const energyBalance = consumed - energyBurned;
  const budgetDelta = budgetTargetToDate - consumed;

  let estimatedWeightChangeKg: number | null = null;
  if (days.length >= 4 && loggedDays === days.length) {
    const raw = energyBalance / KCAL_PER_KG;
    estimatedWeightChangeKg =
      Math.round(
        Math.max(
          -WEEKLY_KG_ESTIMATE_CAP,
          Math.min(WEEKLY_KG_ESTIMATE_CAP, raw),
        ) * 10,
      ) / 10;
  }

  return {
    budgetTargetToDate,
    consumed,
    remaining: Math.max(0, budgetDelta),
    over: Math.max(0, -budgetDelta),
    energyBurned,
    energyBalance,
    loggedDays,
    elapsedDays: days.length,
    estimatedWeightChangeKg,
  };
}
