import type { TodayJob } from "@/lib/activation/today-job";

export type WeeklyReviewAction =
  | "check_in"
  | "log_meal"
  | "log_workout"
  | "log_water"
  | "continue";

export type WeeklyReview = {
  workouts: number;
  meals: number;
  waterDays: number;
  streak: number;
  nextAction: WeeklyReviewAction;
  href: string;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
};

export function resolveWeeklyReview(input: {
  workouts: number;
  meals: number;
  waterDays: number;
  streak: number;
  workoutsTarget?: number;
}): WeeklyReview {
  const target = input.workoutsTarget ?? 3;
  let nextAction: WeeklyReviewAction = "continue";
  if (input.workouts < target) nextAction = "log_workout";
  else if (input.meals < 5) nextAction = "log_meal";
  else if (input.waterDays < 4) nextAction = "log_water";
  else if (input.streak < 3) nextAction = "check_in";

  const hrefByAction: Record<WeeklyReviewAction, string> = {
    check_in: "/streak",
    log_meal: "/chat/maya",
    log_workout: "/library",
    log_water: "/chat/maya",
    continue: "/chat/kai",
  };

  return {
    workouts: input.workouts,
    meals: input.meals,
    waterDays: input.waterDays,
    streak: input.streak,
    nextAction,
    href: hrefByAction[nextAction],
    titleKey: `home.weekly_review.${nextAction}.title`,
    bodyKey: `home.weekly_review.${nextAction}.body`,
    ctaKey: `home.weekly_review.${nextAction}.cta`,
  };
}

export function weeklyReviewToJob(review: WeeklyReview): TodayJob {
  const kind =
    review.nextAction === "continue"
      ? "continue"
      : review.nextAction === "check_in"
        ? "check_in"
        : review.nextAction === "log_meal"
          ? "log_meal"
          : review.nextAction === "log_workout"
            ? "log_workout"
            : "log_water";
  return {
    kind,
    href: review.href,
    titleKey: review.titleKey,
    bodyKey: review.bodyKey,
    ctaKey: review.ctaKey,
  };
}
