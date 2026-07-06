import type { Json } from "@/lib/types/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type CronJobName =
  | "cleanup"
  | "cost-check"
  | "self-recovery"
  | "notifications"
  | "retention-purge"
  | "outbox"
  | "leaderboard-snapshot"
  | "backup-verification";

export type CronRunStatus = "ok" | "error";

/** Records a cron heartbeat (service_role RPC). */
export async function recordCronRun(
  jobName: CronJobName,
  status: CronRunStatus,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.rpc("record_cron_run", {
      p_job_name: jobName,
      p_status: status,
      p_detail: (detail ?? null) as Json,
    });
    if (error) {
      logger.warn("[cron-monitor] record failed", {
        jobName,
        error: error.message,
      });
    }
  } catch (error) {
    logger.warn("[cron-monitor] record exception", {
      jobName,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export type CronJobSnapshot = {
  jobName: string;
  lastRunAt: string;
  lastStatus: CronRunStatus;
  stale: boolean;
  staleHours: number;
};

/** Returns cron heartbeats; flags jobs older than maxAgeHours as stale. */
export async function getCronSnapshots(
  maxAgeHours = 26,
): Promise<CronJobSnapshot[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("cron_job_runs")
    .select("job_name, last_run_at, last_status")
    .order("job_name");

  if (error) {
    logger.warn("[cron-monitor] snapshot read failed", { error: error.message });
    return [];
  }

  const now = Date.now();
  const maxMs = maxAgeHours * 60 * 60 * 1000;

  return (data ?? []).map((row) => {
    const lastRunAt = row.last_run_at ?? new Date(0).toISOString();
    const ageMs = now - new Date(lastRunAt).getTime();
    const staleHours = Math.round(ageMs / (60 * 60 * 1000));
    return {
      jobName: row.job_name,
      lastRunAt,
      lastStatus: row.last_status as CronRunStatus,
      stale: ageMs > maxMs,
      staleHours,
    };
  });
}
