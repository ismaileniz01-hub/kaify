import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { defineCronRoute } from "@/lib/api/route-handler";
import { createCostAlert } from "@/lib/services/cost-admin.service";
import { getCronCostSnapshot } from "@/lib/services/cost-cron.service";
import { getOutboxBacklog } from "@/lib/services/outbox-processor.service";
import { dailyAnomalyMultiplier, userDailyTokenAlertThreshold } from "@/lib/ai/cost";
import { platformDailyUsdHardCap } from "@/lib/ai/daily-cost-cap";
import { getCronSnapshots, recordCronRun } from "@/lib/services/cron-monitor.service";
import { enterDegradedMode } from "@/lib/resilience/degraded-mode";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/cost-check — detect abnormal AI spend and write cost_alerts. */
export const GET = defineCronRoute("/api/cron/cost-check", async () => {
  try {
    const alerts: string[] = [];
    const multiplier = dailyAnomalyMultiplier();
    const userThreshold = userDailyTokenAlertThreshold();
    const platformCap = platformDailyUsdHardCap();

    const snapshot = await getCronCostSnapshot();
    const { todayUsd, avgDailyUsd, topUsersToday } = snapshot;

    if (platformCap > 0 && todayUsd >= platformCap) {
      const msg = `Platform daily AI spend hard cap: $${todayUsd.toFixed(4)} >= $${platformCap}`;
      await createCostAlert({
        alertType: "platform_spend_cap",
        severity: "critical",
        message: msg,
        metadata: { todayUsd, platformCap },
      });
      alerts.push(msg);
      await enterDegradedMode(msg);
      logger.error("cost-check platform cap", { todayUsd, platformCap });
    } else if (avgDailyUsd > 0 && todayUsd > avgDailyUsd * multiplier) {
      const msg = `Global AI spend anomaly: today $${todayUsd.toFixed(4)} vs 7d avg $${avgDailyUsd.toFixed(4)}/day (${multiplier}x threshold)`;
      await createCostAlert({
        alertType: "global_spend_spike",
        severity: "critical",
        message: msg,
        metadata: { todayUsd, avgDailyUsd, multiplier },
      });
      alerts.push(msg);
      await enterDegradedMode(msg);
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

    const outbox = await getOutboxBacklog();
    if (outbox.pending >= 200 || (outbox.oldestAgeMinutes ?? 0) >= 120 || outbox.poison > 0) {
      const msg = `Outbox backlog: pending=${outbox.pending} oldestAgeMin=${outbox.oldestAgeMinutes} poison=${outbox.poison}`;
      await createCostAlert({
        alertType: "outbox_backlog",
        severity: outbox.poison > 0 ? "critical" : "warn",
        message: msg,
        metadata: outbox,
      });
      alerts.push(msg);
      logger.warn("cost-check outbox backlog", outbox);
    }

    const payload = {
      ranAt: new Date().toISOString(),
      todayUsd,
      avgDailyUsd,
      platformCap,
      outbox,
      alertsCreated: alerts.length,
      alerts,
      cronJobs: cronSnapshots,
    };

    await recordCronRun("cost-check", "ok", {
      alertsCreated: alerts.length,
      todayUsd,
      outboxPending: outbox.pending,
    });

    return payload;
  } catch (error) {
    await recordCronRun("cost-check", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
