/** ~7700 kcal of net deficit ≈ 1 kg of body fat. */
export const KCAL_PER_KG = 7700;
const KG_CAP = 5;

export type WeeklyEnergyDay = {
  caloriesConsumed?: number | null;
  caloriesBurned?: number | null;
};

export type WeeklyEnergySummary = {
  eaten: number;
  burned: number;
  /** Negative = estimated loss ("verilen kg"). */
  kgDelta: number;
};

function kcal(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Weekly eaten / burned totals plus a 1-decimal kg estimate from
 * logged days only (empty days do not invent a full-week deficit).
 */
export function summarizeWeeklyEnergy(
  history: WeeklyEnergyDay[] | null | undefined,
  calorieGoal: number,
): WeeklyEnergySummary {
  const days = history ?? [];
  const eaten = Math.round(days.reduce((sum, day) => sum + kcal(day.caloriesConsumed), 0));
  const burned = Math.round(days.reduce((sum, day) => sum + kcal(day.caloriesBurned), 0));
  const loggedDays = days.filter((day) => kcal(day.caloriesConsumed) > 0).length;
  const goal =
    Number.isFinite(calorieGoal) && calorieGoal > 0 ? calorieGoal : 2100;

  if (loggedDays === 0 && burned === 0) {
    return { eaten: 0, burned: 0, kgDelta: 0 };
  }

  const net = eaten - burned - goal * loggedDays;
  const raw = net / KCAL_PER_KG;
  const kgDelta = Math.max(-KG_CAP, Math.min(KG_CAP, Math.round(raw * 10) / 10));
  return { eaten, burned, kgDelta };
}
