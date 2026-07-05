import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database.types";

export type AnalyticsDailyRow = {
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

export type HealthStepRow = {
  entry_date: string;
  steps: number;
};

export type MealTotalsRow = {
  calories_consumed: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** User-scoped reads (RLS). */
export async function createAnalyticsReadClient(): Promise<SupabaseClient> {
  return createServerSupabaseClient() as unknown as SupabaseClient;
}

/** Admin reads for cross-table aggregation. */
export function createAnalyticsAdminReadClient(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

export async function readAnalyticsDailyRow(
  client: SupabaseClient,
  userId: string,
  entryDate: string,
): Promise<AnalyticsDailyRow | null> {
  const { data } = await client
    .from("analytics_daily")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_date", entryDate)
    .maybeSingle();
  return (data as AnalyticsDailyRow | null) ?? null;
}

export async function readHealthStepsRange(
  client: SupabaseClient,
  userId: string,
  weekStart: string,
  today: string,
): Promise<HealthStepRow[]> {
  const { data } = await client
    .from("health_steps")
    .select("entry_date, steps")
    .eq("user_id", userId)
    .gte("entry_date", weekStart)
    .lte("entry_date", today)
    .order("entry_date", { ascending: true });
  return (data as HealthStepRow[]) ?? [];
}

export async function readPreviousWeightKg(
  client: SupabaseClient,
  userId: string,
  beforeDate: string,
): Promise<number | null> {
  const { data } = await client
    .from("analytics_daily")
    .select("weight_kg")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .lt("entry_date", beforeDate)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg != null ? Number(data.weight_kg) : null;
}

export async function readWeeklyAnalyticsSummary(
  client: SupabaseClient,
  userId: string,
  weekStart: string,
  today: string,
) {
  const { data } = await client
    .from("analytics_daily")
    .select(
      "entry_date, calories_consumed, calorie_goal, protein_g, protein_goal_g, workouts_completed",
    )
    .eq("user_id", userId)
    .gte("entry_date", weekStart)
    .lte("entry_date", today);
  return data ?? [];
}

export async function readMayaAnalysisMessages(
  client: SupabaseClient,
  userId: string,
  startIso: string,
  endIso: string,
) {
  const { data } = await client
    .from("chat_messages")
    .select("payload, created_at")
    .eq("user_id", userId)
    .eq("coach_id", "maya")
    .eq("sender", "coach")
    .eq("message_type", "analysis")
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  return data ?? [];
}

export async function readLeoAnalysisMessages(
  client: SupabaseClient,
  userId: string,
  weekStart: string,
  today: string,
) {
  const { data } = await client
    .from("chat_messages")
    .select("payload")
    .eq("user_id", userId)
    .eq("coach_id", "leo")
    .eq("message_type", "analysis")
    .gte("created_at", `${weekStart}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);
  return data ?? [];
}

export async function readMealTotalsRow(
  client: SupabaseClient,
  userId: string,
  entryDate: string,
): Promise<MealTotalsRow | null> {
  const { data } = await client
    .from("analytics_daily")
    .select("calories_consumed, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
    .eq("entry_date", entryDate)
    .maybeSingle();
  return (data as MealTotalsRow | null) ?? null;
}

export async function readUserTimezone(
  client: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await client
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  return data?.timezone ?? "UTC";
}

export type { Json };
