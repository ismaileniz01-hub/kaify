import { getOwnProfile } from "@/lib/services/profile.service";
import { getStreakStatus, type StreakStatusDTO } from "@/lib/services/streak-status.service";
import { getTodayNutritionSnapshot } from "@/lib/services/analytics.service";
import { buildKaiFoodInsight } from "@/lib/kai-food-insight";
import { resolveLocale, translateKey } from "@/lib/i18n/dictionary";
import { getDailyMotivationQuote } from "@/lib/motivation-quotes";
import type { ProfileDTO } from "@/lib/types/domain.types";

export type HomeDTO = {
  displayName: string;
  motivation: string;
  dailyTip: string;
  kaiFoodInsight: string | null;
  stats: {
    steps: number | null;
    streak: number;
    goalPercent: number | null;
  };
  kaiLevel: number;
};

export type HomeDataPrefetch = {
  profile?: ProfileDTO;
  streakStatus?: StreakStatusDTO;
};

export async function getHomeData(
  userId: string,
  localeOverride?: string | null,
  prefetch?: HomeDataPrefetch,
): Promise<HomeDTO> {
  const [profile, streakStatus, todayNutrition] = await Promise.all([
    prefetch?.profile
      ? Promise.resolve(prefetch.profile)
      : getOwnProfile(userId),
    prefetch?.streakStatus
      ? Promise.resolve(prefetch.streakStatus)
      : getStreakStatus(userId),
    getTodayNutritionSnapshot(userId).catch(() => null),
  ]);

  const resolvedLocale = resolveLocale(localeOverride ?? profile.locale);

  const [motivation, dailyTip] = await Promise.all([
    getDailyMotivationQuote(resolvedLocale),
    translateKey(resolvedLocale, "home.tip.text"),
  ]);

  const steps = todayNutrition?.steps ?? null;
  const goalPercent =
    todayNutrition && todayNutrition.calorieGoal > 0
      ? Math.min(
          100,
          Math.round(
            (todayNutrition.caloriesConsumed / todayNutrition.calorieGoal) * 100,
          ),
        )
      : null;

  return {
    displayName: profile.displayName,
    motivation,
    dailyTip,
    kaiFoodInsight: buildKaiFoodInsight(todayNutrition ?? null, resolvedLocale),
    stats: {
      steps,
      streak: streakStatus.currentStreak,
      goalPercent,
    },
    kaiLevel: streakStatus.kaiUnlockedLevel,
  };
}
