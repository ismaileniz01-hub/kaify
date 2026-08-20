/**
 * Weekly eaten vs remaining kcal to lose 1 kg of fat, plus kg from this week's deficit.
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
  /** Kcal still to "give" to lose 1 kg of fat. */
  burned: number;
  /** Negative = estimated loss ("verilen kg"). */
  kgDelta: number;
};

function kcal(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Weekly eaten total, remaining kcal to 1 kg fat loss, and a 1-decimal kg
 * estimate from logged days only (empty days do not invent a full-week deficit).
 */
export function summarizeWeeklyEnergy(
  history: WeeklyEnergyDay[] | null | undefined,
  calorieGoal: number,
): WeeklyEnergySummary {
  const days = history ?? [];
  const eaten = Math.round(days.reduce((sum, day) => sum + kcal(day.caloriesConsumed), 0));
  const foodDays = days.filter((day) => kcal(day.caloriesConsumed) > 0).length;
  const goal =
    Number.isFinite(calorieGoal) && calorieGoal > 0 ? calorieGoal : 2100;

  if (foodDays === 0) {
    return { eaten: 0, burned: KCAL_PER_KG, kgDelta: 0 };
  }

  const net = eaten - goal * foodDays;
  const raw = net / KCAL_PER_KG;
  const kgDelta = Math.max(-KG_CAP, Math.min(KG_CAP, Math.round(raw * 10) / 10));
  const deficit = Math.max(0, -net);
  const burned = Math.max(0, Math.round(KCAL_PER_KG - deficit));
  return { eaten, burned, kgDelta };
}
