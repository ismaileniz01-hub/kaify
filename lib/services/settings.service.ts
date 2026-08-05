import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrimaryGoal } from "@/lib/validations/goals.schema";
import { PRIMARY_GOALS } from "@/lib/validations/goals.schema";

export type UserSettingsDTO = {
  /** DB column workout_reminders — gates streak_risk push jobs. */
  workoutReminders: boolean;
  /** Alias for workoutReminders (correct product name). */
  streakRiskReminders: boolean;
  waterReminder: boolean;
  soundEffects: boolean;
  chatSounds: boolean;
  unitSystem: "metric" | "imperial";
  leaderboardOptOut: boolean;
  marketingEmails: boolean;
  primaryGoal: PrimaryGoal | null;
  goalsConfigured: boolean;
};

function parsePrimaryGoal(value: unknown): PrimaryGoal | null {
  if (typeof value !== "string") return null;
  return (PRIMARY_GOALS as readonly string[]).includes(value)
    ? (value as PrimaryGoal)
    : null;
}

function mapRow(row: {
  workout_reminders: boolean;
  water_reminder: boolean;
  sound_effects: boolean;
  chat_sounds: boolean;
  unit_system: string;
  marketing_emails?: boolean;
  primary_goal?: string | null;
  goals_configured?: boolean;
}): Omit<UserSettingsDTO, "leaderboardOptOut"> {
  const workoutReminders = row.workout_reminders;
  return {
    workoutReminders,
    streakRiskReminders: workoutReminders,
    waterReminder: row.water_reminder,
    soundEffects: row.sound_effects,
    chatSounds: row.chat_sounds,
    unitSystem: row.unit_system === "imperial" ? "imperial" : "metric",
    marketingEmails: row.marketing_emails ?? true,
    primaryGoal: parsePrimaryGoal(row.primary_goal),
    goalsConfigured: Boolean(row.goals_configured),
  };
}

const DEFAULTS: Omit<UserSettingsDTO, "leaderboardOptOut"> = {
  workoutReminders: true,
  streakRiskReminders: true,
  waterReminder: false,
  soundEffects: true,
  chatSounds: true,
  unitSystem: "metric",
  marketingEmails: true,
  primaryGoal: null,
  goalsConfigured: false,
};

export async function getUserSettings(userId: string): Promise<UserSettingsDTO> {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("profiles")
      .select("leaderboard_opt_out")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const leaderboardOptOut = profile?.leaderboard_opt_out ?? false;

  if (!data) {
    return { ...DEFAULTS, leaderboardOptOut };
  }

  return { ...mapRow(data), leaderboardOptOut };
}

export async function upsertUserSettings(
  userId: string,
  patch: Partial<UserSettingsDTO>,
): Promise<UserSettingsDTO> {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  if (patch.leaderboardOptOut !== undefined) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ leaderboard_opt_out: patch.leaderboardOptOut })
      .eq("id", userId);

    if (profileError) {
      throw new ApiError("INTERNAL_ERROR", "Liderlik tablosu ayarı kaydedilemedi.");
    }
  }

  const settingsPatch = { ...patch };
  delete settingsPatch.leaderboardOptOut;
  delete settingsPatch.streakRiskReminders;

  const streakToggle =
    patch.streakRiskReminders !== undefined
      ? patch.streakRiskReminders
      : patch.workoutReminders;

  if (
    Object.keys(settingsPatch).length === 0 &&
    streakToggle === undefined &&
    patch.primaryGoal === undefined &&
    patch.goalsConfigured === undefined
  ) {
    return getUserSettings(userId);
  }

  const { data, error } = await (supabase as unknown as SupabaseClient)
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...(streakToggle !== undefined
          ? { workout_reminders: streakToggle }
          : {}),
        ...(settingsPatch.waterReminder !== undefined
          ? { water_reminder: settingsPatch.waterReminder }
          : {}),
        ...(settingsPatch.soundEffects !== undefined
          ? { sound_effects: settingsPatch.soundEffects }
          : {}),
        ...(settingsPatch.chatSounds !== undefined
          ? { chat_sounds: settingsPatch.chatSounds }
          : {}),
        ...(settingsPatch.unitSystem !== undefined
          ? { unit_system: settingsPatch.unitSystem }
          : {}),
        ...(settingsPatch.marketingEmails !== undefined
          ? { marketing_emails: settingsPatch.marketingEmails }
          : {}),
        ...(patch.primaryGoal !== undefined
          ? { primary_goal: patch.primaryGoal }
          : {}),
        ...(patch.goalsConfigured !== undefined
          ? { goals_configured: patch.goalsConfigured }
          : {}),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError("INTERNAL_ERROR", "Ayarlar kaydedilemedi.");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("leaderboard_opt_out")
    .eq("id", userId)
    .maybeSingle();

  return {
    ...mapRow(data),
    leaderboardOptOut: profile?.leaderboard_opt_out ?? false,
  };
}
