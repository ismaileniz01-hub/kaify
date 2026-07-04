export type StreakDramaVariant = "none" | "at_risk" | "freezie_save" | "lost_day";

export type StreakDramaState = {
  variant: StreakDramaVariant;
  daysSinceCheckIn: number;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeStreakDrama(params: {
  currentStreak: number;
  lastCheckInDate: string | null;
  freezieBalance: number;
}): StreakDramaState {
  const { currentStreak, lastCheckInDate, freezieBalance } = params;
  const today = utcToday();

  if (currentStreak <= 0 || !lastCheckInDate) {
    return { variant: "none", daysSinceCheckIn: 0 };
  }

  if (lastCheckInDate === today) {
    return { variant: "none", daysSinceCheckIn: 0 };
  }

  const last = new Date(`${lastCheckInDate}T00:00:00.000Z`);
  const now = new Date(`${today}T00:00:00.000Z`);
  const daysSince = Math.round((now.getTime() - last.getTime()) / 86_400_000);

  if (daysSince === 1) {
    return { variant: "at_risk", daysSinceCheckIn: daysSince };
  }

  if (daysSince >= 2 && freezieBalance > 0) {
    return { variant: "freezie_save", daysSinceCheckIn: daysSince };
  }

  if (daysSince >= 2) {
    return { variant: "lost_day", daysSinceCheckIn: daysSince };
  }

  return { variant: "none", daysSinceCheckIn: daysSince };
}
