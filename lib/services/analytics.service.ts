import { localTodayDate } from "@/lib/date-utils";
import { cached } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import type { Json } from "@/lib/types/database.types";
import {
  createAnalyticsAdminReadClient,
  createAnalyticsReadClient,
  readAnalyticsDailyRow,
  readHealthStepsRange,
  readLeoAnalysisMessages,
  readPreviousWeightKg,
  readLatestWeightKg,
  readLatestGoalRow,
  readProfileWeightKg,
  readUserTimezone,
  readWeeklyAnalyticsSummary,
  type AnalyticsDailyRow,
} from "@/lib/repositories/analytics-read.repository";
import {
  invalidateAnalyticsUserCache,
  writeAnalyticsDailyPatch,
  writeAnalyticsMealIncrement,
  writeHealthStepsBatch,
} from "@/lib/repositories/analytics-write.repository";
import {
  hydrateTodaySnapshot,
  localDateKeysEnding,
  sumWeekWorkouts,
} from "@/lib/analytics/hydrate-today";
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

export type CalorieDayDTO = {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  workoutsCompleted: number;
};

export type WeeklyFitnessScoreDTO = {
  foodScore: number;
  bodyScore: number;
  combinedScore: number;
  foodDaysLogged: number;
  bodyScansCount: number;
  weeklyGoalPercent: number;
};

export type AnalyticsBundleDTO = {
  today: AnalyticsDailyDTO;
  weeklySteps: WeeklyStepsDTO;
  calorieHistory: CalorieDayDTO[];
  weightTrendKg: number | null;
  weeklyScore: WeeklyFitnessScoreDTO;
  weekWorkoutsCompleted: number;
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
  let goalPctSum = 0;
  let goalDays = 0;

  for (const row of weekAnalytics) {
    const calGoal = Number(row.calorie_goal) || 2100;
    const cal = Number(row.calories_consumed) || 0;
    const proteinGoal = Number(row.protein_goal_g) || 150;
    const protein = Number(row.protein_g) || 0;
    const workouts = Number(row.workouts_completed) || 0;
    const workoutTarget = 5;

    if (cal > 0 || protein > 0 || workouts > 0) {
      goalDays += 1;
      const calPct = calGoal > 0 ? Math.min(100, (cal / calGoal) * 100) : 0;
      const workoutPct =
        workoutTarget > 0 ? Math.min(100, (workouts / workoutTarget) * 100) : 0;
      goalPctSum += (calPct + workoutPct) / 2;
    }

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
    weeklyGoalPercent: goalDays > 0 ? Math.round(goalPctSum / goalDays) : 0,
  };
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

  const [todayRow, lastWeightKg, lastGoalRow, profileWeightKg] = await Promise.all([
    readAnalyticsDailyRow(readClient, userId, today),
    readLatestWeightKg(readClient, userId, today),
    readLatestGoalRow(readClient, userId, today),
    readProfileWeightKg(readClient, userId).catch(() => null),
  ]);

  const stored = todayRow ? mapRow(todayRow as AnalyticsRow) : defaultToday(today);
  const todayDto = hydrateTodaySnapshot(stored, {
    hasTodayRow: Boolean(todayRow),
    lastWeightKg: lastWeightKg ?? profileWeightKg,
    lastGoals: lastGoalRow
      ? {
          calorieGoal: lastGoalRow.calorie_goal,
          workoutsTarget: lastGoalRow.workouts_target,
          waterGoalLiters: Number(lastGoalRow.water_goal_liters),
          proteinGoalG: lastGoalRow.protein_goal_g,
          carbsGoalG: lastGoalRow.carbs_goal_g,
          fatGoalG: lastGoalRow.fat_goal_g,
        }
      : null,
  });
  return todayDto;
}

export async function getAnalyticsBundle(userId: string): Promise<AnalyticsBundleDTO> {
  return cached(
    CacheKeys.analyticsBundle(userId),
    CacheTTL.analyticsUser,
    () => loadAnalyticsBundle(userId),
  );
}

/** Uncached loader — use from HTTP routes wrapped in cachedWithStale. */
export async function loadAnalyticsBundle(userId: string): Promise<AnalyticsBundleDTO> {
  const readClient = await createAnalyticsReadClient();
  const timezone = await resolveUserTimezone(userId);
  const today = localTodayDate(timezone);

  const weekAgo = new Date(`${today}T12:00:00.000Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);

  const [todayRow, weekRows, prevWeightKg, weekNutrition, lastWeightKg, lastGoalRow, profileWeightKg] =
    await Promise.all([
      readAnalyticsDailyRow(readClient, userId, today),
      readHealthStepsRange(readClient, userId, weekStart, today),
      readPreviousWeightKg(readClient, userId, today),
      readWeeklyAnalyticsSummary(readClient, userId, weekStart, today),
      readLatestWeightKg(readClient, userId, today),
      readLatestGoalRow(readClient, userId, today),
      readProfileWeightKg(readClient, userId).catch(() => null),
    ]);

  const storedDto = todayRow ? mapRow(todayRow as AnalyticsRow) : defaultToday(today);
  let todayDto = hydrateTodaySnapshot(storedDto, {
    hasTodayRow: Boolean(todayRow),
    lastWeightKg: lastWeightKg ?? profileWeightKg,
    lastGoals: lastGoalRow
      ? {
          calorieGoal: lastGoalRow.calorie_goal,
          workoutsTarget: lastGoalRow.workouts_target,
          waterGoalLiters: Number(lastGoalRow.water_goal_liters),
          proteinGoalG: lastGoalRow.protein_goal_g,
          carbsGoalG: lastGoalRow.carbs_goal_g,
          fatGoalG: lastGoalRow.fat_goal_g,
        }
      : null,
  });

  if (weekRows && weekRows.length > 0) {
    const stepSum = weekRows.reduce((sum, r) => sum + (r.steps ?? 0), 0);
    const todaySteps =
      weekRows.find((r) => r.entry_date === today)?.steps ?? stepSum;
    todayDto = { ...todayDto, steps: todaySteps };
  }

  const weeklySteps: WeeklyStepsDTO = [];
  for (const key of localDateKeysEnding(today, 7)) {
    const found = weekRows?.find((r) => r.entry_date === key);
    weeklySteps.push({ date: key, steps: found?.steps ?? 0 });
  }

  let weightTrendKg: number | null = null;
  if (todayDto.weightKg != null && prevWeightKg != null) {
    const delta = Number(todayDto.weightKg) - prevWeightKg;
    weightTrendKg = Math.abs(delta) < 0.05 ? 0 : delta;
  }

  const calorieHistory: CalorieDayDTO[] = [];
  for (const key of localDateKeysEnding(today, 7)) {
    const found = weekNutrition.find((r) => r.entry_date === key) as
      | {
          calories_consumed?: number;
          calories_burned?: number;
          workouts_completed?: number;
        }
      | undefined;
    calorieHistory.push({
      date: key,
      caloriesConsumed:
        key === today
          ? Math.max(Number(found?.calories_consumed) || 0, todayDto.caloriesConsumed)
          : Number(found?.calories_consumed) || 0,
      caloriesBurned: Number(found?.calories_burned) || 0,
      workoutsCompleted: Number(found?.workouts_completed) || 0,
    });
  }

  const weeklyScore = await computeWeeklyScore(userId, weekStart, today);
  const weekWorkoutsCompleted = sumWeekWorkouts(calorieHistory);

  return {
    today: todayDto,
    weeklySteps,
    calorieHistory,
    weightTrendKg,
    weeklyScore,
    weekWorkoutsCompleted,
  };
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
  if (patch.waterGoalLiters !== undefined)
    jsonPatch.water_goal_liters = patch.waterGoalLiters;

  await writeAnalyticsDailyPatch(userId, date, jsonPatch);
}

/** User-authored daily targets (calorie / workouts / water). */
export async function saveUserGoals(
  userId: string,
  goals: {
    calorieGoal?: number;
    workoutsTarget?: number;
    waterGoalLiters?: number;
  },
): Promise<AnalyticsDailyDTO> {
  await patchAnalyticsDaily(userId, {
    ...(goals.calorieGoal !== undefined
      ? { calorieGoal: goals.calorieGoal }
      : {}),
    ...(goals.workoutsTarget !== undefined
      ? { workoutsTarget: goals.workoutsTarget }
      : {}),
    ...(goals.waterGoalLiters !== undefined
      ? { waterGoalLiters: goals.waterGoalLiters }
      : {}),
  });
  await invalidateAnalyticsCache(userId);
  return getTodayNutritionSnapshot(userId);
}

/**
 * Adds a logged meal's macros onto today's running totals (accumulate, not
 * overwrite). Uses an atomic SQL increment — no read-modify-write race.
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

  const timezone = await resolveUserTimezone(userId);
  const date = localTodayDate(timezone);

  await writeAnalyticsMealIncrement(userId, date, add);
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
