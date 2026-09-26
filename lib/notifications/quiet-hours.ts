export function isQuietHour(
  localHour: number,
  start: number | null | undefined,
  end: number | null | undefined,
): boolean {
  if (start == null || end == null) return false;
  if (start === end) return false;
  if (start < end) return localHour >= start && localHour < end;
  return localHour >= start || localHour < end;
}

export function inactivityBucket(days: number): "7" | "14" | "30" | "90" {
  if (days >= 30) return "30";
  if (days >= 14) return "14";
  if (days >= 7) return "7";
  return "90";
}

export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return Math.floor((now.getTime() - then) / (24 * 60 * 60 * 1000));
}
