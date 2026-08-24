export type StepsPoint = { date: string; steps: number };
export type StepsPeriod = "W" | "M" | "3M";

export type StepsChartView = {
  labels: string[];
  values: number[];
  avg: number;
  trendPct: number | null;
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function todayStepsFromRange(
  today: string,
  rows: Array<{ entry_date: string; steps?: number | null }>,
): number {
  const found = rows.find((row) => row.entry_date === today);
  return Number(found?.steps) || 0;
}

export function weekdayLabel(date: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(
      new Date(`${date}T12:00:00.000Z`),
    );
  } catch {
    return date.slice(8, 10);
  }
}

export function periodAvailable(points: StepsPoint[], period: StepsPeriod): boolean {
  if (period === "W") return points.length > 0;
  if (period === "M") return points.length >= 28;
  return points.length >= 84;
}

export function trendPercent(values: number[]): number | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const first = avg(values.slice(0, mid));
  const second = avg(values.slice(mid));
  if (first <= 0 && second <= 0) return 0;
  if (first <= 0) return 100;
  return Math.round(((second - first) / first) * 100);
}

export function buildStepsChart(
  points: StepsPoint[],
  period: StepsPeriod,
  locale: string,
): StepsChartView | null {
  if (!periodAvailable(points, period)) return null;

  if (period === "W") {
    const week = points.slice(-7);
    const values = week.map((point) => Math.max(0, point.steps));
    return {
      labels: week.map((point) => weekdayLabel(point.date, locale)),
      values,
      avg: Math.round(avg(values)),
      trendPct: trendPercent(values),
    };
  }

  if (period === "M") {
    const month = points.slice(-28);
    const buckets = [0, 1, 2, 3].map((week) => {
      const slice = month.slice(week * 7, week * 7 + 7);
      return slice.reduce((sum, point) => sum + Math.max(0, point.steps), 0);
    });
    return {
      labels: ["W1", "W2", "W3", "W4"],
      values: buckets,
      avg: Math.round(avg(buckets)),
      trendPct: trendPercent(buckets),
    };
  }

  const quarter = points.slice(-90);
  const byMonth = new Map<string, number>();
  for (const point of quarter) {
    const key = point.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.max(0, point.steps));
  }
  const months = [...byMonth.entries()].slice(-3);
  if (months.length === 0) return null;
  const values = months.map(([, total]) => total);
  return {
    labels: months.map(([key]) => key.slice(5)),
    values,
    avg: Math.round(avg(values)),
    trendPct: trendPercent(values),
  };
}
