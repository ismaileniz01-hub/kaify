import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserSettingsDTO = {
  workoutReminders: boolean;
  waterReminder: boolean;
  soundEffects: boolean;
  chatSounds: boolean;
  unitSystem: "metric" | "imperial";
  leaderboardOptOut: boolean;
  marketingEmails: boolean;
};

function mapRow(row: {
  workout_reminders: boolean;
  water_reminder: boolean;
  sound_effects: boolean;
  chat_sounds: boolean;
  unit_system: string;
  marketing_emails?: boolean;
}): Omit<UserSettingsDTO, "leaderboardOptOut"> {
  return {
    workoutReminders: row.workout_reminders,
    waterReminder: row.water_reminder,
    soundEffects: row.sound_effects,
    chatSounds: row.chat_sounds,
    unitSystem: row.unit_system === "imperial" ? "imperial" : "metric",
    marketingEmails: row.marketing_emails ?? true,
  };
}

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
    return {
      workoutReminders: true,
      waterReminder: false,
      soundEffects: true,
      chatSounds: true,
      unitSystem: "metric",
      leaderboardOptOut,
      marketingEmails: true,
    };
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

  if (Object.keys(settingsPatch).length === 0) {
    return getUserSettings(userId);
  }

  const { data, error } = await (supabase as unknown as SupabaseClient)
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...(settingsPatch.workoutReminders !== undefined
          ? { workout_reminders: settingsPatch.workoutReminders }
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
