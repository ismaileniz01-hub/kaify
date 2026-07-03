import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export type StreakStatusDTO = {
  currentStreak: number;
  longestStreak: number;
  freezieBalance: number;
  lastCheckInDate: string | null;
  kaiUnlockedLevel: number;
};

export async function getStreakStatus(userId: string): Promise<StreakStatusDTO> {
  const supabase = await createServerSupabaseClient();

  const [streakResult, kaiResult] = await Promise.all([
    supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, freezie_balance, last_check_in_date")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_kai_state")
      .select("unlocked_level")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (streakResult.error) {
    logger.error("[streak-status.service] streak error", { error: streakResult.error.message });
    throw new ApiError("INTERNAL_ERROR", "Streak bilgisi alınamadı.");
  }

  const streak = streakResult.data;

  return {
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
    freezieBalance: streak?.freezie_balance ?? 0,
    lastCheckInDate: streak?.last_check_in_date ?? null,
    kaiUnlockedLevel: kaiResult.data?.unlocked_level ?? 1,
  };
}
