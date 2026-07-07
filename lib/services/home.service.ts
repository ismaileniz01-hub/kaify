import { getOwnProfile } from "@/lib/services/profile.service";
import { getStreakStatus } from "@/lib/services/streak-status.service";
import { getTodayNutritionSnapshot } from "@/lib/services/analytics.service";
import { buildKaiFoodInsight } from "@/lib/kai-food-insight";
import { resolveLocale, translateKey } from "@/lib/i18n/dictionary";
import { getDailyMotivationQuote } from "@/lib/motivation-quotes";

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

export async function getHomeData(
  userId: string,
  localeOverride?: string | null,
): Promise<HomeDTO> {
  const [profile, streakStatus, todayNutrition] = await Promise.all([
    getOwnProfile(userId),
    getStreakStatus(userId),
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
