import { localDayQueryWindow, localTodayDate, isLocalDate } from "@/lib/date-utils";
import { cached } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/types/database.types";
import {
  createAnalyticsAdminReadClient,
  createAnalyticsReadClient,
  readAnalyticsDailyRow,
  readHealthStepsRange,
  readLeoAnalysisMessages,
  readMayaAnalysisMessages,
  readMealTotalsRow,
  readPreviousWeightKg,
  readUserTimezone,
  readWeeklyAnalyticsSummary,
  type AnalyticsDailyRow,
} from "@/lib/repositories/analytics-read.repository";
import {
  invalidateAnalyticsUserCache,
  writeAnalyticsDailyPatch,
  writeHealthStepsBatch,
} from "@/lib/repositories/analytics-write.repository";
export type AnalyticsDailyDTO = {
  entryDate: string;
  weightKg: number | null;
  caloriesConsumed: number;
  caloriesBurned: number;
  calorieGoal: number;
  workoutsCompleted: number;
  workoutsTarget: number;
  waterLiters: number;
  waterGoalLiters: number;
  steps: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
};

export type WeeklyStepsDTO = {
  date: string;
  steps: number;
}[];

export type WeeklyFitnessScoreDTO = {
  foodScore: number;
  bodyScore: number;
  combinedScore: number;
  foodDaysLogged: number;
  bodyScansCount: number;
};

export type AnalyticsBundleDTO = {
  today: AnalyticsDailyDTO;
  weeklySteps: WeeklyStepsDTO;
  weightTrendKg: number | null;
  weeklyScore: WeeklyFitnessScoreDTO;
};

type AnalyticsRow = AnalyticsDailyRow;

async function invalidateAnalyticsCache(userId: string): Promise<void> {
  await invalidateAnalyticsUserCache(userId);
}

async function resolveUserTimezone(userId: string): Promise<string> {
  const admin = createAnalyticsAdminReadClient();
  return readUserTimezone(admin, userId);
}
function mapRow(row: AnalyticsRow): AnalyticsDailyDTO {
  return {
    entryDate: row.entry_date,
    weightKg: row.weight_kg,
    caloriesConsumed: row.calories_consumed,
    caloriesBurned: row.calories_burned,
    calorieGoal: row.calorie_goal,
    workoutsCompleted: Number(row.workouts_completed),
    workoutsTarget: row.workouts_target,
    waterLiters: Number(row.water_liters),
    waterGoalLiters: Number(row.water_goal_liters),
    steps: row.steps,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    proteinGoalG: row.protein_goal_g,
    carbsGoalG: row.carbs_goal_g,
    fatGoalG: row.fat_goal_g,
  };
}

function defaultToday(entryDate?: string): AnalyticsDailyDTO {
  const today = entryDate ?? new Date().toISOString().slice(0, 10);
  return {
    entryDate: today,
    weightKg: null,
    caloriesConsumed: 0,
    caloriesBurned: 0,
    calorieGoal: 2100,
    workoutsCompleted: 0,
    workoutsTarget: 5,
    waterLiters: 0,
    waterGoalLiters: 2.5,
    steps: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    proteinGoalG: 150,
    carbsGoalG: 250,
    fatGoalG: 65,
  };
}

type MealTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function extractFoodFromPayload(payload: Json | null): MealTotals | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const analysis = (payload as Record<string, unknown>).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
  const food = (analysis as Record<string, unknown>).food_analysis;
  if (!food || typeof food !== "object" || Array.isArray(food)) return null;

  const row = food as Record<string, unknown>;
  const calories = Number(row.calories);
  const protein = Number(row.protein);
  const carbs = Number(row.carb ?? row.carbs);
  const fat = Number(row.fat);
  if (![calories, protein, carbs, fat].some((n) => Number.isFinite(n) && n > 0)) {
    return null;
  }

  return {
    calories: Number.isFinite(calories) ? Math.max(0, Math.round(calories)) : 0,
    protein: Number.isFinite(protein) ? Math.max(0, Math.round(protein)) : 0,
    carbs: Number.isFinite(carbs) ? Math.max(0, Math.round(carbs)) : 0,
    fat: Number.isFinite(fat) ? Math.max(0, Math.round(fat)) : 0,
  };
}

function extractBodyScoreFromPayload(payload: Json | null): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const analysis = (payload as Record<string, unknown>).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
  const row = analysis as Record<string, unknown>;
  const score = Number(row.overall_score ?? row.overallScore);
  if (!Number.isFinite(score) || score <= 0) return null;
  return Math.min(100, Math.max(0, Math.round(score)));
}

async function computeWeeklyScore(
  userId: string,
  weekStart: string,
  today: string,
): Promise<WeeklyFitnessScoreDTO> {
  const admin = createAnalyticsAdminReadClient();

  const [weekAnalytics, leoMessages] = await Promise.all([
    readWeeklyAnalyticsSummary(admin, userId, weekStart, today),
    readLeoAnalysisMessages(admin, userId, weekStart, today),
  ]);

  let foodDaysLogged = 0;
  let foodDayScoreSum = 0;

  for (const row of weekAnalytics) {
    const calGoal = Number(row.calorie_goal) || 2100;
    const cal = Number(row.calories_consumed) || 0;
    const proteinGoal = Number(row.protein_goal_g) || 150;
    const protein = Number(row.protein_g) || 0;
    const workouts = Number(row.workouts_completed) || 0;

    if (cal <= 0 && protein <= 0 && workouts <= 0) continue;
    foodDaysLogged += 1;

    const calAdherence = calGoal > 0 ? 1 - Math.min(1, Math.abs(cal - calGoal) / calGoal) : 0;
    const proteinAdherence = proteinGoal > 0 ? Math.min(1, protein / proteinGoal) : 0;
    const workoutBonus = Math.min(1, workouts / 2) * 0.2;
    const dayScore = (calAdherence * 0.5 + proteinAdherence * 0.3 + workoutBonus) * 10;
    foodDayScoreSum += dayScore;
  }

  const foodScore =
    foodDaysLogged > 0
      ? Math.round((foodDayScoreSum / foodDaysLogged) * 10) / 10
      : 0;

  const bodyScores: number[] = [];
  for (const msg of leoMessages) {
    const s = extractBodyScoreFromPayload(msg.payload ?? null);
    if (s != null) bodyScores.push(s);
  }

  const bodyScore =
    bodyScores.length > 0
      ? Math.round((bodyScores.reduce((a, b) => a + b, 0) / bodyScores.length) / 10 * 10) / 10
      : 0;

  const combinedScore =
    bodyScores.length > 0 && foodDaysLogged > 0
      ? Math.round(((foodScore + bodyScore) / 2) * 10) / 10
      : foodDaysLogged > 0
        ? foodScore
        : bodyScore;

  return {
    foodScore,
    bodyScore,
    combinedScore,
    foodDaysLogged,
    bodyScansCount: bodyScores.length,
  };
}

/** Sum Maya food-photo analyses for a local calendar day from chat messages. */
async function sumMayaMealsForDay(
  userId: string,
  entryDate: string,
  timezone: string,
): Promise<MealTotals> {
  const admin = createAnalyticsAdminReadClient();
  const { start, end } = localDayQueryWindow(entryDate, timezone);

  const messages = await readMayaAnalysisMessages(admin, userId, start, end);

  const chatTotals: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const msg of messages) {
    if (!isLocalDate(msg.created_at, entryDate, timezone)) continue;
    const meal = extractFoodFromPayload(msg.payload ?? null);
    if (!meal) continue;
    chatTotals.calories += meal.calories;
    chatTotals.protein += meal.protein;
    chatTotals.carbs += meal.carbs;
    chatTotals.fat += meal.fat;
  }
  return chatTotals;
}

function mergeMealTotals(stored: AnalyticsDailyDTO, chat: MealTotals): AnalyticsDailyDTO {
  if (chat.calories === 0 && chat.protein === 0 && chat.carbs === 0 && chat.fat === 0) {
    return stored;
  }
  return {
    ...stored,
    caloriesConsumed: Math.max(stored.caloriesConsumed, chat.calories),
    proteinG: Math.max(stored.proteinG, chat.protein),
    carbsG: Math.max(stored.carbsG, chat.carbs),
    fatG: Math.max(stored.fatG, chat.fat),
  };
}

/** Persist chat totals when they exceed stored DB values (fire-and-forget safe). */
async function persistMayaMealsIfNeeded(
  userId: string,
  entryDate: string,
  stored: AnalyticsDailyDTO,
  chat: MealTotals,
): Promise<void> {
  if (
    chat.calories <= stored.caloriesConsumed &&
    chat.protein <= stored.proteinG &&
    chat.carbs <= stored.carbsG &&
    chat.fat <= stored.fatG
  ) {
    return;
  }
  if (chat.calories === 0 && chat.protein === 0) return;

  try {
    await patchAnalyticsDaily(
      userId,
      {
        caloriesConsumed: chat.calories,
        proteinG: chat.protein,
        carbsG: chat.carbs,
        fatG: chat.fat,
      },
      entryDate,
    );
    await invalidateAnalyticsCache(userId);
  } catch (syncError) {
    logger.warn("[analytics.service] maya meal persist failed", {
      error: syncError instanceof Error ? syncError.message : String(syncError),
    });
  }
}

/** Lightweight today snapshot for the home screen (no weekly score). */
export async function getTodayNutritionSnapshot(userId: string): Promise<AnalyticsDailyDTO> {
  return cached(
    CacheKeys.analyticsToday(userId),
    CacheTTL.analyticsUser,
    () => loadTodayNutritionSnapshot(userId),
  );
}

async function loadTodayNutritionSnapshot(userId: string): Promise<AnalyticsDailyDTO> {
  const readClient = await createAnalyticsReadClient();
  const timezone = await resolveUserTimezone(userId);
  const today = localTodayDate(timezone);

  const todayRow = await readAnalyticsDailyRow(readClient, userId, today);

  let todayDto = todayRow ? mapRow(todayRow as AnalyticsRow) : defaultToday(today);
  const chatTotals = await sumMayaMealsForDay(userId, today, timezone);
  todayDto = mergeMealTotals(todayDto, chatTotals);
  void persistMayaMealsIfNeeded(userId, today, todayRow ? mapRow(todayRow as AnalyticsRow) : defaultToday(today), chatTotals);
  return todayDto;
}

export async function getAnalyticsBundle(userId: string): Promise<AnalyticsBundleDTO> {
  return cached(
    CacheKeys.analyticsBundle(userId),
    CacheTTL.analyticsUser,
    () => loadAnalyticsBundle(userId),
  );
}

async function loadAnalyticsBundle(userId: string): Promise<AnalyticsBundleDTO> {
  const readClient = await createAnalyticsReadClient();
  const timezone = await resolveUserTimezone(userId);
  const today = localTodayDate(timezone);

  const weekAgo = new Date(`${today}T12:00:00.000Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);

  const [todayRow, weekRows, prevWeightKg] = await Promise.all([
    readAnalyticsDailyRow(readClient, userId, today),
    readHealthStepsRange(readClient, userId, weekStart, today),
    readPreviousWeightKg(readClient, userId, today),
  ]);

  const storedDto = todayRow ? mapRow(todayRow as AnalyticsRow) : defaultToday(today);
  const chatTotals = await sumMayaMealsForDay(userId, today, timezone);
  let todayDto = mergeMealTotals(storedDto, chatTotals);
  void persistMayaMealsIfNeeded(userId, today, storedDto, chatTotals);

  if (weekRows && weekRows.length > 0) {
    const stepSum = weekRows.reduce((sum, r) => sum + (r.steps ?? 0), 0);
    const todaySteps =
      weekRows.find((r) => r.entry_date === today)?.steps ?? stepSum;
    todayDto = { ...todayDto, steps: todaySteps };
  }

  const weeklySteps: WeeklyStepsDTO = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = weekRows?.find((r) => r.entry_date === key);
    weeklySteps.push({ date: key, steps: found?.steps ?? 0 });
  }

  let weightTrendKg: number | null = null;
  if (todayDto.weightKg != null && prevWeightKg != null) {
    const delta = Number(todayDto.weightKg) - prevWeightKg;
    weightTrendKg = Math.abs(delta) < 0.05 ? 0 : delta;
  }

  const weeklyScore = await computeWeeklyScore(userId, weekStart, today);

  return { today: todayDto, weeklySteps, weightTrendKg, weeklyScore };
}

export async function patchAnalyticsDaily(
  userId: string,
  patch: Partial<Record<string, number | null>>,
  entryDate?: string,
): Promise<void> {
  const date = entryDate ?? localTodayDate(await resolveUserTimezone(userId));

  const jsonPatch: Json = {};
  if (patch.weightKg !== undefined) jsonPatch.weight_kg = patch.weightKg;
  if (patch.caloriesConsumed !== undefined)
    jsonPatch.calories_consumed = patch.caloriesConsumed;
  if (patch.caloriesBurned !== undefined)
    jsonPatch.calories_burned = patch.caloriesBurned;
  if (patch.workoutsCompleted !== undefined)
    jsonPatch.workouts_completed = patch.workoutsCompleted;
  if (patch.workoutsTarget !== undefined)
    jsonPatch.workouts_target = patch.workoutsTarget;
  if (patch.waterLiters !== undefined) jsonPatch.water_liters = patch.waterLiters;
  if (patch.steps !== undefined) jsonPatch.steps = patch.steps;
  if (patch.proteinG !== undefined) jsonPatch.protein_g = patch.proteinG;
  if (patch.carbsG !== undefined) jsonPatch.carbs_g = patch.carbsG;
  if (patch.fatG !== undefined) jsonPatch.fat_g = patch.fatG;
  if (patch.proteinGoalG !== undefined)
    jsonPatch.protein_goal_g = patch.proteinGoalG;
  if (patch.carbsGoalG !== undefined) jsonPatch.carbs_goal_g = patch.carbsGoalG;
  if (patch.fatGoalG !== undefined) jsonPatch.fat_goal_g = patch.fatGoalG;
  if (patch.calorieGoal !== undefined) jsonPatch.calorie_goal = patch.calorieGoal;

  await writeAnalyticsDailyPatch(userId, date, jsonPatch);
}

/**
 * Adds a logged meal's macros onto today's running totals (accumulate, not
 * overwrite). Used by the Maya food-photo pipeline so a breakfast photo is
 * reflected in the analytics screen. Reads current totals with the admin
 * client, then writes the summed values via the SET-semantics RPC.
 */
export async function addMealToAnalytics(
  userId: string,
  meal: { calories?: number; protein?: number; carbs?: number; fat?: number },
): Promise<void> {
  const add = {
    calories: Math.max(0, Math.round(meal.calories ?? 0)),
    protein: Math.max(0, Math.round(meal.protein ?? 0)),
    carbs: Math.max(0, Math.round(meal.carbs ?? 0)),
    fat: Math.max(0, Math.round(meal.fat ?? 0)),
  };
  if (add.calories + add.protein + add.carbs + add.fat === 0) return;

  const admin = createAnalyticsAdminReadClient();
  const timezone = await resolveUserTimezone(userId);
  const date = localTodayDate(timezone);

  const current = await readMealTotalsRow(admin, userId, date);

  await patchAnalyticsDaily(
    userId,
    {
      caloriesConsumed: (current?.calories_consumed ?? 0) + add.calories,
      proteinG: (current?.protein_g ?? 0) + add.protein,
      carbsG: (current?.carbs_g ?? 0) + add.carbs,
      fatG: (current?.fat_g ?? 0) + add.fat,
    },
    date,
  );
  await invalidateAnalyticsCache(userId);
}

export async function syncHealthSteps(
  userId: string,
  entries: { date: string; steps: number; source: "healthkit" | "google_fit" | "manual" }[],
): Promise<void> {
  if (entries.length === 0) return;

  await writeHealthStepsBatch(userId, entries);

  const latestByDate = new Map<string, number>();
  for (const entry of entries) {
    latestByDate.set(entry.date, entry.steps);
  }

  await Promise.all(
    [...latestByDate.entries()].map(([date, steps]) =>
      patchAnalyticsDaily(userId, { steps }, date),
    ),
  );
}
