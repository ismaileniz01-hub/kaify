import { getOwnProfile } from "@/lib/services/profile.service";
import { getStreakStatus, type StreakStatusDTO } from "@/lib/services/streak-status.service";
import {
  getTodayNutritionSnapshot,
  type AnalyticsDailyDTO,
} from "@/lib/services/analytics.service";
import { getUserSettings } from "@/lib/services/settings.service";
import { buildKaiFoodInsight } from "@/lib/kai-food-insight";
import { resolveLocale, translateKey } from "@/lib/i18n/dictionary";
import { getDailyMotivationQuote } from "@/lib/motivation-quotes";
import { localTodayDate } from "@/lib/date-utils";
import {
  resolveTodayJob,
  type FirstTaskProgress,
  type TodayJob,
} from "@/lib/activation/today-job";
import type { ProfileDTO } from "@/lib/types/domain.types";
import type { PrimaryGoal } from "@/lib/validations/goals.schema";

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
  todayJob: TodayJob;
  firstTask: FirstTaskProgress;
  goals: {
    configured: boolean;
    primaryGoal: PrimaryGoal | null;
    calorieGoal: number;
    workoutsTarget: number;
    waterGoalLiters: number;
  };
};

/**
 * Locale-free home payload — safe to cache without presentation dimensions.
 * Localized strings are applied by `localizeHomeData` after the cache hit.
 */
export type HomeCoreDTO = {
  displayName: string;
  stats: HomeDTO["stats"];
  kaiLevel: number;
  todayJob: TodayJob;
  firstTask: FirstTaskProgress;
  goals: HomeDTO["goals"];
  /** Enough nutrition state to rebuild kaiFoodInsight for any locale. */
  nutrition: AnalyticsDailyDTO | null;
  /** Profile locale used when the request does not override. */
  profileLocale: string;
};

export type HomeDataPrefetch = {
  profile?: ProfileDTO;
  streakStatus?: StreakStatusDTO;
};

export async function getHomeCoreData(
  userId: string,
  prefetch?: HomeDataPrefetch,
): Promise<HomeCoreDTO> {
  const [profile, streakStatus, todayNutrition, settings] = await Promise.all([
    prefetch?.profile
      ? Promise.resolve(prefetch.profile)
      : getOwnProfile(userId),
    prefetch?.streakStatus
      ? Promise.resolve(prefetch.streakStatus)
      : getStreakStatus(userId),
    getTodayNutritionSnapshot(userId).catch(() => null),
    getUserSettings(userId).catch(() => null),
  ]);

  const today = localTodayDate(profile.timezone ?? "UTC");
  const checkedInToday = streakStatus.lastCheckInDate === today;
  const goalsConfigured = settings?.goalsConfigured ?? false;

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
    stats: {
      steps,
      streak: streakStatus.currentStreak,
      goalPercent,
    },
    kaiLevel: streakStatus.kaiUnlockedLevel,
    todayJob: resolveTodayJob({
      checkedInToday,
      goalsConfigured,
      streakAtRisk:
        streakStatus.currentStreak >= 1 &&
        Boolean(streakStatus.lastCheckInDate) &&
        !checkedInToday,
    }),
    firstTask: {
      checkInDone: checkedInToday || streakStatus.currentStreak > 0,
      goalsDone: goalsConfigured,
      chatDone: false,
    },
    goals: {
      configured: goalsConfigured,
      primaryGoal: settings?.primaryGoal ?? null,
      calorieGoal: todayNutrition?.calorieGoal ?? 2100,
      workoutsTarget: todayNutrition?.workoutsTarget ?? 5,
      waterGoalLiters: todayNutrition?.waterGoalLiters ?? 2.5,
    },
    nutrition: todayNutrition,
    profileLocale: profile.locale,
  };
}

/** Applies presentation-only locale strings to a cached home core payload. */
export async function localizeHomeData(
  core: HomeCoreDTO,
  localeOverride?: string | null,
): Promise<HomeDTO> {
  const resolvedLocale = resolveLocale(localeOverride ?? core.profileLocale);
  const [motivation, dailyTip] = await Promise.all([
    getDailyMotivationQuote(resolvedLocale),
    translateKey(resolvedLocale, "home.tip.text"),
  ]);

  return {
    displayName: core.displayName,
    motivation,
    dailyTip,
    kaiFoodInsight: buildKaiFoodInsight(core.nutrition, resolvedLocale),
    stats: core.stats,
    kaiLevel: core.kaiLevel,
    todayJob: core.todayJob,
    firstTask: core.firstTask,
    goals: core.goals,
  };
}

export async function getHomeData(
  userId: string,
  localeOverride?: string | null,
  prefetch?: HomeDataPrefetch,
): Promise<HomeDTO> {
  const core = await getHomeCoreData(userId, prefetch);
  return localizeHomeData(core, localeOverride);
}
