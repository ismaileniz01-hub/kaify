import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";

export type UserSettingsDTO = {
  workoutReminders: boolean;
  waterReminder: boolean;
  soundEffects: boolean;
  chatSounds: boolean;
  unitSystem: "metric" | "imperial";
};

function mapRow(row: {
  workout_reminders: boolean;
  water_reminder: boolean;
  sound_effects: boolean;
  chat_sounds: boolean;
  unit_system: string;
}): UserSettingsDTO {
  return {
    workoutReminders: row.workout_reminders,
    waterReminder: row.water_reminder,
    soundEffects: row.sound_effects,
    chatSounds: row.chat_sounds,
    unitSystem: row.unit_system === "imperial" ? "imperial" : "metric",
  };
}

export async function getUserSettings(userId: string): Promise<UserSettingsDTO> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      workoutReminders: true,
      waterReminder: false,
      soundEffects: true,
      chatSounds: true,
      unitSystem: "metric",
    };
  }

  return mapRow(data);
}

export async function upsertUserSettings(
  userId: string,
  patch: Partial<UserSettingsDTO>,
): Promise<UserSettingsDTO> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...(patch.workoutReminders !== undefined
          ? { workout_reminders: patch.workoutReminders }
          : {}),
        ...(patch.waterReminder !== undefined
          ? { water_reminder: patch.waterReminder }
          : {}),
        ...(patch.soundEffects !== undefined
          ? { sound_effects: patch.soundEffects }
          : {}),
        ...(patch.chatSounds !== undefined ? { chat_sounds: patch.chatSounds } : {}),
        ...(patch.unitSystem !== undefined ? { unit_system: patch.unitSystem } : {}),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError("INTERNAL_ERROR", "Ayarlar kaydedilemedi.");
  }

  return mapRow(data);
}
