/**
 * Production hourly cadence is provided by pg_cron (Hobby-safe).
 * The Vercel cron entry (daily) is a backup only.
 *
 * Kept outside route.ts because Next.js App Router route modules may only
 * export HTTP handlers and route segment config.
 */
export const NOTIFICATIONS_EXPECTED_CADENCE = "hourly" as const;

// Local-hour windows (inclusive). Hourly cron catches these; dedup dedupes.
export const STREAK_RISK_HOURS = new Set([19, 20, 21]);
// Water: every 2 hours from 08:00 to 22:00 local time.
export const WATER_HOURS = new Set([8, 10, 12, 14, 16, 18, 20, 22]);
export const WEEKLY_HOURS = new Set([18, 19]);
export const PRAISE_HOUR = 12;
