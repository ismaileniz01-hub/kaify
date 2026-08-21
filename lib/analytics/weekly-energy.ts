/**
 * Weekly eaten vs burned kcal, plus kg from this week's energy balance.
 * ~7700 kcal net deficit ≈ 1 kg body fat.
 */
export const KCAL_PER_KG = 7700;
const KG_CAP = 5;

export type WeeklyEnergyDay = {
  caloriesConsumed?: number | null;
  caloriesBurned?: number | null;
};

export type WeeklyEnergySummary = {
  eaten: number;
  /** Logged + resting burn for days that have any energy data. */
  burned: number;
  /** Negative = estimated loss ("verilen kg"). */
  kgDelta: number;
};

function kcal(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Sum eaten vs effective burned. Resting TDEE (calorieGoal) fills days that
 * already have a food or workout log, and always fills "today" so verilen
 * is not stuck at 7700 while alınan stays 0.
 */
export function summarizeWeeklyEnergy(
  history: WeeklyEnergyDay[] | null | undefined,
  calorieGoal: number,
  opts?: { todayIndex?: number },
): WeeklyEnergySummary {
  const days = history ?? [];
  const goal =
    Number.isFinite(calorieGoal) && calorieGoal > 0 ? calorieGoal : 2100;
  const todayIndex =
    typeof opts?.todayIndex === "number" ? opts.todayIndex : days.length - 1;

  const eaten = Math.round(
    days.reduce((sum, day) => sum + kcal(day.caloriesConsumed), 0),
  );

  let burned = 0;
  let counted = 0;
  days.forEach((day, index) => {
    const consumed = kcal(day.caloriesConsumed);
    const workout = kcal(day.caloriesBurned);
    const isToday = index === todayIndex;
    if (!isToday && consumed <= 0 && workout <= 0) return;
    burned += goal + workout;
    counted += 1;
  });

  if (counted === 0) {
    return { eaten: 0, burned: Math.round(goal), kgDelta: 0 };
  }

  burned = Math.round(burned);
  if (eaten <= 0 && days.every((day) => kcal(day.caloriesBurned) <= 0)) {
    return { eaten: 0, burned, kgDelta: 0 };
  }

  const net = eaten - burned;
  const raw = net / KCAL_PER_KG;
  const kgDelta = Math.max(-KG_CAP, Math.min(KG_CAP, Math.round(raw * 10) / 10));
  return { eaten, burned, kgDelta };
}
