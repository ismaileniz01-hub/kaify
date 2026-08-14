import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import {
  persistBackupVerification,
  runBackupVerification,
} from "@/lib/services/backup-verification.service";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";
import { createExecutionBudget, runBatchedWithBudget } from "@/lib/cron/execution-budget";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLEANUP_CURSOR_KEY = "cron:cleanup:streak:cursor:v1";
const PAGE_SIZE = 500;

/** GET /api/cron/cleanup — daily maintenance + DR manifest (Vercel Cron). */
export const GET = defineCronRoute("/api/cron/cleanup", async () => {
  try {
    const backupResult = await runBackupVerification();
    await persistBackupVerification(backupResult);
    await recordCronRun("backup-verification", backupResult.status === "error" ? "error" : "ok", {
      status: backupResult.status,
      migrationVersion: backupResult.manifest.migrations.latestVersion,
    });

    const admin = createAdminSupabaseClient();
    const budget = createExecutionBudget(45_000);
    const saved = await cacheGet<{ from: number }>(CLEANUP_CURSOR_KEY);

    let teamChatUnlocked = 0;
    const checkpoint = await runBatchedWithBudget<number>({
      budget,
      batchReserveMs: 2_000,
      initialCursor: saved?.from ?? 0,
      runBatch: async (cursor) => {
        const from = cursor ?? 0;
        const { data: streakRows } = await admin
          .from("user_streaks")
          .select("user_id")
          .gte("current_streak", 7)
          .range(from, from + PAGE_SIZE - 1);

        const userIds = (streakRows ?? []).map((r) => r.user_id);
        if (userIds.length === 0) {
          return { nextCursor: null, processed: 0, done: true };
        }

        const { data: updated } = await admin
          .from("profiles")
          .update({
            team_chat_unlocked: true,
            team_chat_unlocked_at: new Date().toISOString(),
          })
          .in("id", userIds)
          .eq("team_chat_unlocked", false)
          .select("id");
        teamChatUnlocked += updated?.length ?? 0;

        if (userIds.length < PAGE_SIZE) {
          return { nextCursor: null, processed: userIds.length, done: true };
        }
        return { nextCursor: from + PAGE_SIZE, processed: userIds.length, done: false };
      },
    });

    if (checkpoint.complete) {
      await cacheDelete(CLEANUP_CURSOR_KEY);
    } else if (checkpoint.cursor != null) {
      await cacheSet(CLEANUP_CURSOR_KEY, { from: checkpoint.cursor }, 60 * 60 * 24);
      logger.info("cron.cleanup partial", {
        cursor: checkpoint.cursor,
        processed: checkpoint.processed,
      });
    }

    const { data: deletedKeys } = await admin
      .from("idempotency_keys")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recoveredStuck } = await admin
      .from("idempotency_keys")
      .delete()
      .eq("status", "in_progress")
      .lt("created_at", stuckCutoff)
      .select("id");

    const payload = {
      ranAt: new Date().toISOString(),
      backup: {
        status: backupResult.status,
        migrationVersion: backupResult.manifest.migrations.latestVersion,
        errors: backupResult.errors,
      },
      results: {
        teamChatUnlocked,
        expiredIdempotencyKeysDeleted: deletedKeys?.length ?? 0,
        stuckIdempotencyKeysRecovered: recoveredStuck?.length ?? 0,
        complete: checkpoint.complete,
        resumedFromCursor: Boolean(saved),
      },
    };

    await recordCronRun("cleanup", "ok", payload.results);

    return payload;
  } catch (error) {
    await recordCronRun("cleanup", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
