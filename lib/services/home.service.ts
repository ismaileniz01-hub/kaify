import { getOwnProfile } from "@/lib/services/profile.service";
import { getStreakStatus, type StreakStatusDTO } from "@/lib/services/streak-status.service";
import {
  getTodayNutritionSnapshot,
  type AnalyticsDailyDTO,
} from "@/lib/services/analytics.service";
import { getUserSettings } from "@/lib/services/settings.service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildKaiFoodInsight } from "@/lib/kai-food-insight";
import { resolveLocale, translateKey } from "@/lib/i18n/dictionary";
import { getDailyMotivationQuote } from "@/lib/motivation-quotes";
import { localTodayDate } from "@/lib/date-utils";
import {
  resolveTodayJob,
  type FirstTaskProgress,
  type TodayJob,
} from "@/lib/activation/today-job";
import { resolveWeeklyReview, type WeeklyReview } from "@/lib/activation/weekly-review";
import { daysSince, inactivityBucket } from "@/lib/notifications/quiet-hours";
import { emitProductEvent, productEventIdempotencyKey } from "@/lib/events/product";
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
  weeklyReview: WeeklyReview;
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
  weeklyReview: WeeklyReview;
  firstTask: FirstTaskProgress;
  goals: HomeDTO["goals"];
  /** Enough nutrition state to rebuild kaiFoodInsight for any locale. */
  nutrition: AnalyticsDailyDTO | null;
  /** Profile locale used when the request does not override. */
  profileLocale: string;
};

async function userHasSentChat(userId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("chat_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("sender", "user")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export type HomeDataPrefetch = {
  profile?: ProfileDTO;
  streakStatus?: StreakStatusDTO;
};

async function loadWeeklyTotals(userId: string, today: string): Promise<{
  workouts: number;
  meals: number;
  waterDays: number;
}> {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const from = start.toISOString().slice(0, 10);
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("analytics_daily")
    .select("workouts_completed, calories_consumed, water_liters")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", today);
  const rows = data ?? [];
  return {
    workouts: rows.reduce((sum, row) => sum + Number(row.workouts_completed ?? 0), 0),
    meals: rows.filter((row) => Number(row.calories_consumed ?? 0) > 0).length,
    waterDays: rows.filter((row) => Number(row.water_liters ?? 0) > 0).length,
  };
}

export async function getHomeCoreData(
  userId: string,
  prefetch?: HomeDataPrefetch,
): Promise<HomeCoreDTO> {
  const [profile, streakStatus, todayNutrition, settings, chatDone] =
    await Promise.all([
      prefetch?.profile
        ? Promise.resolve(prefetch.profile)
        : getOwnProfile(userId),
      prefetch?.streakStatus
        ? Promise.resolve(prefetch.streakStatus)
        : getStreakStatus(userId),
      getTodayNutritionSnapshot(userId).catch(() => null),
      getUserSettings(userId).catch(() => null),
      userHasSentChat(userId).catch(() => false),
    ]);

  const today = localTodayDate(profile.timezone ?? "UTC");
  const week = await loadWeeklyTotals(userId, today).catch(() => ({
    workouts: todayNutrition?.workoutsCompleted ?? 0,
    meals: (todayNutrition?.caloriesConsumed ?? 0) > 0 ? 1 : 0,
    waterDays: (todayNutrition?.waterLiters ?? 0) > 0 ? 1 : 0,
  }));
  const checkedInToday = streakStatus.lastCheckInDate === today;
  const goalsConfigured = settings?.goalsConfigured ?? false;
  const inactivityDays = daysSince(
    streakStatus.lastCheckInDate ? `${streakStatus.lastCheckInDate}T00:00:00Z` : null,
  );

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

  const weeklyReview = resolveWeeklyReview({
    workouts: week.workouts,
    meals: week.meals,
    waterDays: week.waterDays,
    streak: streakStatus.currentStreak,
    workoutsTarget: todayNutrition?.workoutsTarget ?? 3,
  });
  const todayJob = resolveTodayJob({
    checkedInToday,
    goalsConfigured,
    mealLogged: (todayNutrition?.caloriesConsumed ?? 0) > 0,
    workoutLogged: (todayNutrition?.workoutsCompleted ?? 0) > 0,
    waterLogged: (todayNutrition?.waterLiters ?? 0) > 0,
    inactivityDays,
  });

  emitProductEvent({
    name: "session.daily_job_viewed",
    userId,
    properties: { job: todayJob.kind },
    idempotencyKey: productEventIdempotencyKey([
      "session.daily_job_viewed",
      userId,
      today,
      todayJob.kind,
    ]),
  });
  if (todayJob.recovery) {
    emitProductEvent({
      name: "reactivation.recovery_task_shown",
      userId,
      properties: {
        task: "check_in",
        inactivity_bucket: inactivityBucket(inactivityDays ?? 0),
      },
      idempotencyKey: productEventIdempotencyKey([
        "reactivation.recovery_task_shown",
        userId,
        today,
      ]),
    });
  }

  return {
    displayName: profile.displayName,
    stats: {
      steps,
      streak: streakStatus.currentStreak,
      goalPercent,
    },
    kaiLevel: streakStatus.kaiUnlockedLevel,
    todayJob,
    weeklyReview,
    firstTask: {
      checkInDone: checkedInToday || streakStatus.currentStreak > 0,
      goalsDone: goalsConfigured,
      chatDone,
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
    weeklyReview: core.weeklyReview,
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
