export type StepSample = {
  startDate: string;
  value: number;
};

const MAX_DAILY_STEPS = 100_000;

export function localDateKeyFromIso(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Merge HealthKit / Health Connect step samples into YYYY-MM-DD totals. */
export function aggregateStepSamples(
  samples: StepSample[],
  timeZone: string,
): Array<{ date: string; steps: number }> {
  const byDate = new Map<string, number>();
  for (const sample of samples) {
    if (!sample?.startDate) continue;
    const date = localDateKeyFromIso(sample.startDate, timeZone);
    const steps = Math.max(
      0,
      Math.min(MAX_DAILY_STEPS, Math.round(Number(sample.value) || 0)),
    );
    byDate.set(date, Math.min(MAX_DAILY_STEPS, (byDate.get(date) ?? 0) + steps));
  }
  return [...byDate.entries()]
    .map(([date, steps]) => ({ date, steps }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
