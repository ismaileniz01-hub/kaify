export type TodayJobKind =
  | "check_in"
  | "set_goals"
  | "chat_kai"
  | "continue";

export type TodayJob = {
  kind: TodayJobKind;
  href: string;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
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
  streakAtRisk: boolean;
}): TodayJob {
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
  if (input.streakAtRisk) {
    return {
      kind: "check_in",
      href: "/streak",
      titleKey: "home.today_job.check_in.title",
      bodyKey: "home.today_job.check_in.body",
      ctaKey: "home.today_job.check_in.cta",
    };
  }
  return {
    kind: "chat_kai",
    href: "/chat/kai",
    titleKey: "home.today_job.chat.title",
    bodyKey: "home.today_job.chat.body",
    ctaKey: "home.today_job.chat.cta",
  };
}
