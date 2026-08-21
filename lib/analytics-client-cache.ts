import type { AnalyticsBundleDTO } from "@/lib/services/analytics.service";

const KEY = "kaify:analytics:v2";

export function readAnalyticsCache(): AnalyticsBundleDTO | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: AnalyticsBundleDTO };
    // Stale after 10 minutes — still shown instantly while a fresh fetch runs.
    if (Date.now() - parsed.savedAt > 10 * 60_000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeAnalyticsCache(data: AnalyticsBundleDTO): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // quota / private mode — ignore
  }
}

export const ANALYTICS_UPDATED_EVENT = "kaify:analytics-updated";

export function clearAnalyticsCache(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Chat confirmations call this so the analytics page refetches immediately. */
export function notifyAnalyticsUpdated(): void {
  clearAnalyticsCache();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ANALYTICS_UPDATED_EVENT));
}
