export type StepSample = {
  startDate: string;
  value: number;
};

const MAX_DAILY_STEPS = 100_000;

export type StepReadWindow = {
  startIso: string;
  endIso: string;
  startKey: string;
};

/**
 * Local last-7-days window. `endIso` is the next local midnight so an exclusive
 * HealthKit / Health Connect end still includes every step taken today.
 */
export function stepReadWindow(now: Date, timeZone: string): StepReadWindow {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const exclusiveEnd = new Date(now);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  exclusiveEnd.setHours(0, 0, 0, 0);
  return {
    startIso: start.toISOString(),
    endIso: exclusiveEnd.toISOString(),
    startKey: localDateKeyFromIso(start.toISOString(), timeZone),
  };
}

export function pickStepSamples(
  aggregated: Array<{ startDate?: string; value?: number; values?: { sum?: number } }>,
  raw: Array<{ startDate?: string; value?: number }>,
): StepSample[] {
  const fromAggregated = aggregated
    .map((sample) => ({
      startDate: sample.startDate ?? "",
      value: Math.round(Number(sample.value) || Number(sample.values?.sum) || 0),
    }))
    .filter((sample) => sample.startDate && sample.value > 0);
  if (fromAggregated.length > 0) return fromAggregated;
  return raw
    .map((sample) => ({
      startDate: sample.startDate ?? "",
      value: Math.round(Number(sample.value) || 0),
    }))
    .filter((sample) => sample.startDate && sample.value > 0);
}

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
