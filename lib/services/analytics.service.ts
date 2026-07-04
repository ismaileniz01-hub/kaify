import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/types/database.types";

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

type AnalyticsRow = {
  entry_date: string;
  weight_kg: number | null;
  calories_consumed: number;
  calories_burned: number;
  calorie_goal: number;
  workouts_completed: number;
  workouts_target: number;
  water_liters: number;
  water_goal_liters: number;
  steps: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
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

function defaultToday(): AnalyticsDailyDTO {
  const today = utcToday();
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
  const carbs = Number(row.carb);
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
  const admin = createAdminSupabaseClient();

  const [{ data: weekAnalytics }, { data: leoMessages }] = await Promise.all([
    admin
      .from("analytics_daily")
      .select("entry_date, calories_consumed, calorie_goal, protein_g, protein_goal_g, workouts_completed")
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", today),
    admin
      .from("chat_messages")
      .select("payload")
      .eq("user_id", userId)
      .eq("coach_id", "leo")
      .eq("message_type", "analysis")
      .gte("created_at", `${weekStart}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`),
  ]);

  let foodDaysLogged = 0;
  let foodDayScoreSum = 0;

  for (const row of weekAnalytics ?? []) {
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
  for (const msg of leoMessages ?? []) {
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

/** Sum today's Maya food-photo analyses from chat when analytics_daily is stale. */
async function syncTodayMealsFromMayaChat(
  userId: string,
  entryDate: string,
  stored: AnalyticsDailyDTO,
): Promise<AnalyticsDailyDTO | null> {
  const admin = createAdminSupabaseClient();
  const dayStart = `${entryDate}T00:00:00.000Z`;
  const dayEnd = new Date(`${entryDate}T00:00:00.000Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const { data: messages, error } = await admin
    .from("chat_messages")
    .select("payload")
    .eq("user_id", userId)
    .eq("coach_id", "maya")
    .eq("message_type", "analysis")
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd.toISOString());

  if (error) {
    logger.warn("[analytics.service] maya meal sync read failed", { error: error.message });
    return null;
  }

  const chatTotals: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const msg of messages ?? []) {
    const meal = extractFoodFromPayload(msg.payload ?? null);
    if (!meal) continue;
    chatTotals.calories += meal.calories;
    chatTotals.protein += meal.protein;
    chatTotals.carbs += meal.carbs;
    chatTotals.fat += meal.fat;
  }

  if (chatTotals.calories === 0 && chatTotals.protein === 0) return null;

  // Chat food photos are the source of truth when DB totals lag behind.
  if (
    chatTotals.calories <= stored.caloriesConsumed &&
    chatTotals.protein <= stored.proteinG &&
    chatTotals.carbs <= stored.carbsG &&
    chatTotals.fat <= stored.fatG
  ) {
    return null;
  }

  try {
    await patchAnalyticsDaily(userId, {
      caloriesConsumed: chatTotals.calories,
      proteinG: chatTotals.protein,
      carbsG: chatTotals.carbs,
      fatG: chatTotals.fat,
    }, entryDate);

    const { data: row } = await admin
      .from("analytics_daily")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", entryDate)
      .maybeSingle();

    return row ? mapRow(row as AnalyticsRow) : null;
  } catch (syncError) {
    logger.warn("[analytics.service] maya meal sync patch failed", {
      error: syncError instanceof Error ? syncError.message : String(syncError),
    });
    return null;
  }
}

export async function getAnalyticsBundle(userId: string): Promise<AnalyticsBundleDTO> {
  const supabase = await createServerSupabaseClient();
  const today = utcToday();

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);

  const [
    { data: todayRow, error: todayError },
    { data: weekRows, error: weekError },
    { data: prevWeight, error: prevError },
  ] = await Promise.all([
    supabase
      .from("analytics_daily")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", today)
      .maybeSingle(),
    supabase
      .from("health_steps")
      .select("entry_date, steps")
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", today)
      .order("entry_date", { ascending: true }),
    supabase
      .from("analytics_daily")
      .select("weight_kg")
      .eq("user_id", userId)
      .not("weight_kg", "is", null)
      .lt("entry_date", today)
      .order("entry_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (todayError) logger.error("[analytics.service] today read error", { error: todayError.message });
  if (weekError) logger.error("[analytics.service] steps read error", { error: weekError.message });
  if (prevError) logger.error("[analytics.service] weight read error", { error: prevError.message });

  let todayDto = todayRow ? mapRow(todayRow as AnalyticsRow) : defaultToday();

  const synced = await syncTodayMealsFromMayaChat(userId, today, todayDto);
  if (synced) todayDto = synced;

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
  if (todayDto.weightKg != null && prevWeight?.weight_kg != null) {
    weightTrendKg = Number(todayDto.weightKg) - Number(prevWeight.weight_kg);
  }

  const weeklyScore = await computeWeeklyScore(userId, weekStart, today);

  return { today: todayDto, weeklySteps, weightTrendKg, weeklyScore };
}

export async function patchAnalyticsDaily(
  userId: string,
  patch: Partial<Record<string, number | null>>,
  entryDate?: string,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const date = entryDate ?? utcToday();

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

  const { error } = await admin.rpc("upsert_analytics_daily", {
    p_user_id: userId,
    p_entry_date: date,
    p_patch: jsonPatch,
  });

  if (error) {
    logger.error("[analytics.service] upsert error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Analiz verisi güncellenemedi.");
  }
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

  const admin = createAdminSupabaseClient();
  const date = utcToday();

  const { data: current } = await admin
    .from("analytics_daily")
    .select("calories_consumed, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .maybeSingle();

  await patchAnalyticsDaily(userId, {
    caloriesConsumed: (current?.calories_consumed ?? 0) + add.calories,
    proteinG: (current?.protein_g ?? 0) + add.protein,
    carbsG: (current?.carbs_g ?? 0) + add.carbs,
    fatG: (current?.fat_g ?? 0) + add.fat,
  });
}

export async function syncHealthSteps(
  userId: string,
  entries: { date: string; steps: number; source: "healthkit" | "google_fit" | "manual" }[],
): Promise<void> {
  if (entries.length === 0) return;

  const admin = createAdminSupabaseClient();
  const syncedAt = new Date().toISOString();

  await admin.from("health_steps").upsert(
    entries.map((entry) => ({
      user_id: userId,
      entry_date: entry.date,
      steps: entry.steps,
      source: entry.source,
      synced_at: syncedAt,
    })),
    { onConflict: "user_id,entry_date,source" },
  );

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
