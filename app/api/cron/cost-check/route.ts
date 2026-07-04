import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/api/response";
import { createCostAlert } from "@/lib/services/cost-admin.service";
import { getCronCostSnapshot } from "@/lib/services/cost-cron.service";
import { dailyAnomalyMultiplier, userDailyTokenAlertThreshold } from "@/lib/ai/cost";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { getCronSnapshots, recordCronRun } from "@/lib/services/cron-monitor.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/cost-check — detect abnormal AI spend and write cost_alerts. */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const alerts: string[] = [];
    const multiplier = dailyAnomalyMultiplier();
    const userThreshold = userDailyTokenAlertThreshold();

    const snapshot = await getCronCostSnapshot();
    const { todayUsd, avgDailyUsd, topUsersToday } = snapshot;

    if (avgDailyUsd > 0 && todayUsd > avgDailyUsd * multiplier) {
      const msg = `Global AI spend anomaly: today $${todayUsd.toFixed(4)} vs 7d avg $${avgDailyUsd.toFixed(4)}/day (${multiplier}x threshold)`;
      await createCostAlert({
        alertType: "global_spend_spike",
        severity: "critical",
        message: msg,
        metadata: { todayUsd, avgDailyUsd, multiplier },
      });
      alerts.push(msg);
      logger.error("cost-check global spike", { todayUsd, avgDailyUsd });
    }

    for (const user of topUsersToday) {
      if (user.total_tokens >= userThreshold) {
        const msg = `User ${user.display_name} (${user.user_id.slice(0, 8)}…) used ${user.total_tokens.toLocaleString()} tokens today ($${user.estimated_usd.toFixed(4)})`;
        await createCostAlert({
          alertType: "user_token_spike",
          severity: "warn",
          message: msg,
          metadata: {
            userId: user.user_id,
            totalTokens: user.total_tokens,
            estimatedUsd: user.estimated_usd,
            threshold: userThreshold,
          },
        });
        alerts.push(msg);
      }
    }

    const admin = createAdminSupabaseClient();
    const today = new Date().toISOString().slice(0, 10);
    const { count: blocksToday } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "BLOCKED")
      .gte("created_at", `${today}T00:00:00Z`);

    if ((blocksToday ?? 0) >= 10) {
      const msg = `High quota blocks today: ${blocksToday} users hit limits`;
      await createCostAlert({
        alertType: "quota_blocks_spike",
        severity: "info",
        message: msg,
        metadata: { blocksToday },
      });
      alerts.push(msg);
    }

    const cronSnapshots = await getCronSnapshots();
    for (const job of cronSnapshots) {
      if (job.stale) {
        const msg = `Cron job stale: ${job.jobName} last ran ${job.staleHours}h ago (${job.lastStatus})`;
        await createCostAlert({
          alertType: "cron_stale",
          severity: "warn",
          message: msg,
          metadata: {
            jobName: job.jobName,
            lastRunAt: job.lastRunAt,
            staleHours: job.staleHours,
          },
        });
        alerts.push(msg);
        logger.warn("cost-check stale cron", { job: job.jobName, staleHours: job.staleHours });
      }
    }

    const payload = {
      ranAt: new Date().toISOString(),
      todayUsd,
      avgDailyUsd,
      alertsCreated: alerts.length,
      alerts,
      cronJobs: cronSnapshots,
    };

    await recordCronRun("cost-check", "ok", {
      alertsCreated: alerts.length,
      todayUsd,
    });

    return ok(payload);
  } catch (error) {
    await recordCronRun("cost-check", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return handleApiError(error, { route: "/api/cron/cost-check" });
  }
}
