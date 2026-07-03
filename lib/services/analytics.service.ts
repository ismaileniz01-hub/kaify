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

export type AnalyticsBundleDTO = {
  today: AnalyticsDailyDTO;
  weeklySteps: WeeklyStepsDTO;
  weightTrendKg: number | null;
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

  return { today: todayDto, weeklySteps, weightTrendKg };
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
