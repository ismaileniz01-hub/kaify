export type TodayJobKind =
  | "check_in"
  | "set_goals"
  | "log_meal"
  | "log_workout"
  | "log_water"
  | "continue";

export type TodayJob = {
  kind: TodayJobKind;
  href: string;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  recovery?: boolean;
};

export type FirstTaskProgress = {
  checkInDone: boolean;
  goalsDone: boolean;
  chatDone: boolean;
};

/** Single dominant home action for the day. */
export function resolveTodayJob(input: {
  checkedInToday: boolean;
  goalsConfigured: boolean;
  mealLogged?: boolean;
  workoutLogged?: boolean;
  waterLogged?: boolean;
  inactivityDays?: number | null;
}): TodayJob {
  if ((input.inactivityDays ?? 0) >= 7 && !input.checkedInToday) {
    return {
      kind: "check_in",
      href: "/streak",
      titleKey: "home.today_job.recovery.title",
      bodyKey: "home.today_job.recovery.body",
      ctaKey: "home.today_job.recovery.cta",
      recovery: true,
    };
  }
  if (!input.checkedInToday) {
    return {
      kind: "check_in",
      href: "/streak",
      titleKey: "home.today_job.check_in.title",
      bodyKey: "home.today_job.check_in.body",
      ctaKey: "home.today_job.check_in.cta",
    };
  }
  if (!input.goalsConfigured) {
    return {
      kind: "set_goals",
      href: "/welcome?goals=1",
      titleKey: "home.today_job.goals.title",
      bodyKey: "home.today_job.goals.body",
      ctaKey: "home.today_job.goals.cta",
    };
  }
  if (!input.mealLogged) {
    return {
      kind: "log_meal",
      href: "/chat/maya",
      titleKey: "home.today_job.meal.title",
      bodyKey: "home.today_job.meal.body",
      ctaKey: "home.today_job.meal.cta",
    };
  }
  if (!input.workoutLogged) {
    return {
      kind: "log_workout",
      href: "/library",
      titleKey: "home.today_job.workout.title",
      bodyKey: "home.today_job.workout.body",
      ctaKey: "home.today_job.workout.cta",
    };
  }
  if (!input.waterLogged) {
    return {
      kind: "log_water",
      href: "/chat/maya",
      titleKey: "home.today_job.water.title",
      bodyKey: "home.today_job.water.body",
      ctaKey: "home.today_job.water.cta",
    };
  }
  return {
    kind: "continue",
    href: "/chat/kai",
    titleKey: "home.today_job.continue.title",
    bodyKey: "home.today_job.continue.body",
    ctaKey: "home.today_job.continue.cta",
  };
}
