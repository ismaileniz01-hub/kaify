import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { defineCronRoute } from "@/lib/api/route-handler";
import { logger } from "@/lib/logger";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import {
  createNotificationsBatch,
  type CreateNotificationInput,
} from "@/lib/services/notifications.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type LocalParts = { date: string; hour: number; weekday: string };

/** Resolves a user's local date/hour/weekday from an IANA timezone. */
function localParts(tz: string, now: Date): LocalParts {
  const zone = tz && tz.length > 0 ? tz : "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      weekday: "short",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    let hour = parseInt(get("hour"), 10);
    if (Number.isNaN(hour) || hour === 24) hour = 0;
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      hour,
      weekday: get("weekday"),
    };
  } catch {
    const iso = now.toISOString();
    return { date: iso.slice(0, 10), hour: now.getUTCHours(), weekday: "" };
  }
}

/** ISO week key (e.g. 2026-W27) for weekly-summary dedup. */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Local-hour windows (inclusive). Hourly cron catches these; dedup dedupes.
const STREAK_RISK_HOURS = new Set([19, 20, 21]);
// Water: every 2 hours from 08:00 to 22:00 local time.
const WATER_HOURS = new Set([8, 10, 12, 14, 16, 18, 20, 22]);
const WEEKLY_HOURS = new Set([18, 19]);
const PRAISE_HOUR = 12;

/**
 * GET /api/cron/notifications — timezone-aware engagement notifications.
 * Intended to run hourly. Each notification uses a dedup key so repeated runs
 * within a window never create duplicates.
 */
export const GET = defineCronRoute("/api/cron/notifications", async () => {
  try {
    const admin = createAdminSupabaseClient();
    const now = new Date();
    const week = isoWeek(now);

    // Keyset pagination over profiles: PostgREST caps a single select at ~1000
    // rows, so unbounded selects would silently skip users beyond the first
    // page. Paging by id keeps memory flat and scales to 10k+ users.
    const PAGE_SIZE = 1000;
    let lastId = "";
    let totalCandidates = 0;
    let totalCreated = 0;

    for (;;) {
      let query = admin
        .from("profiles")
        .select("id, timezone")
        .order("id", { ascending: true })
        .limit(PAGE_SIZE);
      if (lastId) query = query.gt("id", lastId);

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) break;

      const ids = profiles.map((p) => p.id);

      const [{ data: settings }, { data: streaks }] = await Promise.all([
        admin
          .from("user_settings")
          .select("user_id, water_reminder, workout_reminders")
          .in("user_id", ids),
        admin
          .from("user_streaks")
          .select("user_id, current_streak, last_check_in_date")
          .in("user_id", ids),
      ]);

      const settingsById = new Map((settings ?? []).map((s) => [s.user_id, s]));
      const streakById = new Map((streaks ?? []).map((s) => [s.user_id, s]));

      const jobs: CreateNotificationInput[] = [];

      for (const profile of profiles) {
        const { date, hour, weekday } = localParts(profile.timezone ?? "UTC", now);
        const setting = settingsById.get(profile.id);
        const streak = streakById.get(profile.id);

        const workoutOn = setting?.workout_reminders ?? true;
        const waterOn = setting?.water_reminder ?? false;
        const currentStreak = streak?.current_streak ?? 0;
        const checkedInToday = streak?.last_check_in_date === date;

        // 1. Streak risk — evening, streak alive, not yet checked in today.
        if (
          workoutOn &&
          STREAK_RISK_HOURS.has(hour) &&
          currentStreak >= 1 &&
          !checkedInToday
        ) {
          jobs.push({
            userId: profile.id,
            type: "streak_risk",
            titleKey: "notif.streak_risk.title",
            bodyKey: "notif.streak_risk.body",
            params: { streak: currentStreak },
            dedupKey: `streak_risk:${date}`,
          });
        }

        // 2. Water reminder — a few times a day when enabled.
        if (waterOn && WATER_HOURS.has(hour)) {
          jobs.push({
            userId: profile.id,
            type: "water_reminder",
            titleKey: "notif.water_reminder.title",
            bodyKey: "notif.water_reminder.body",
            dedupKey: `water:${date}:${hour}`,
          });
        }

        // 3. Weekly summary — Sunday evening.
        if (weekday === "Sun" && WEEKLY_HOURS.has(hour)) {
          jobs.push({
            userId: profile.id,
            type: "weekly_summary",
            titleKey: "notif.weekly_summary.title",
            bodyKey: "notif.weekly_summary.body",
            params: { streak: currentStreak },
            dedupKey: `weekly:${week}`,
          });
        }

        // 4. Praise — midday encouragement for engaged users.
        if (hour === PRAISE_HOUR && currentStreak >= 3 && currentStreak % 3 === 0) {
          jobs.push({
            userId: profile.id,
            type: "praise",
            titleKey: "notif.praise.title",
            bodyKey: "notif.praise.body",
            params: { streak: currentStreak },
            dedupKey: `praise:${date}`,
          });
        }
      }

      totalCandidates += jobs.length;
      totalCreated += await createNotificationsBatch(jobs);

      lastId = ids[ids.length - 1];
      if (profiles.length < PAGE_SIZE) break;
    }

    logger.info("cron notifications run", {
      candidates: totalCandidates,
      created: totalCreated,
    });

    const payload = {
      ranAt: now.toISOString(),
      candidates: totalCandidates,
      created: totalCreated,
    };

    await recordCronRun("notifications", "ok", payload);

    return payload;
  } catch (error) {
    await recordCronRun("notifications", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    logger.error("cron notifications failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
