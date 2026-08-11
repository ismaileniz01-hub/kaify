import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  RETENTION,
  RETENTION_WARNING_DAYS,
  addDaysIso,
  monthsAgoDate,
  monthsAgoIso,
  daysAgoIso,
} from "@/lib/compliance/retention-config";
import { createNotificationsBatch } from "@/lib/services/notifications.service";
import {
  createExecutionBudget,
  runBatchedWithBudget,
} from "@/lib/cron/execution-budget";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";

export type RetentionPurgeResult = {
  ranAt: string;
  deleted: Record<string, number>;
  warningsSent: number;
  complete: boolean;
  resumedFromCursor: boolean;
};

const BATCH_SIZE = 500;
/** Leave headroom under Vercel cron maxDuration (60s). */
const PURGE_BUDGET_MS = 45_000;
const CURSOR_KEY = "cron:retention-purge:cursor:v1";
const CURSOR_TTL_SECONDS = 60 * 60 * 24 * 7;

type PurgeCursor = {
  tableIndex: number;
};

type PurgeTarget = {
  table: string;
  column: string;
  cutoff: string;
  idColumn: string;
  /** Composite PK tables need both columns for safe batched deletes. */
  compositeDateColumn?: string;
};

async function deleteBatch(
  db: SupabaseClient,
  target: PurgeTarget,
): Promise<{ deleted: number; done: boolean }> {
  if (target.compositeDateColumn) {
    const { data: rows, error: selectError } = await db
      .from(target.table)
      .select("user_id, entry_date")
      .lt(target.column, target.cutoff)
      .order(target.compositeDateColumn, { ascending: true })
      .limit(BATCH_SIZE);

    if (selectError) {
      logger.warn("retention.purge select failed", {
        table: target.table,
        error: selectError.message,
      });
      return { deleted: 0, done: true };
    }
    if (!rows?.length) return { deleted: 0, done: true };

    let deleted = 0;
    for (const row of rows) {
      const uid = String((row as unknown as Record<string, unknown>).user_id);
      const date = String((row as unknown as Record<string, unknown>).entry_date);
      const { error: deleteError } = await db
        .from(target.table)
        .delete()
        .eq(target.idColumn, uid)
        .eq(target.compositeDateColumn, date);
      if (!deleteError) deleted += 1;
    }
    return { deleted, done: rows.length < BATCH_SIZE };
  }

  const { data: rows, error: selectError } = await db
    .from(target.table)
    .select(target.idColumn)
    .lt(target.column, target.cutoff)
    .order(target.idColumn, { ascending: true })
    .limit(BATCH_SIZE);

  if (selectError) {
    logger.warn("retention.purge select failed", {
      table: target.table,
      error: selectError.message,
    });
    return { deleted: 0, done: true };
  }

  if (!rows?.length) return { deleted: 0, done: true };

  const ids = rows.map((r) =>
    String((r as unknown as Record<string, unknown>)[target.idColumn]),
  );
  const { error: deleteError } = await db
    .from(target.table)
    .delete()
    .in(target.idColumn, ids);

  if (deleteError) {
    logger.warn("retention.purge delete failed", {
      table: target.table,
      error: deleteError.message,
    });
    return { deleted: 0, done: true };
  }

  return { deleted: ids.length, done: ids.length < BATCH_SIZE };
}

/** Notifies users whose chat history will be purged within 30 days. */
export async function sendRetentionWarnings(): Promise<number> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const purgeCutoff = monthsAgoIso(RETENTION.chatMonths);
  const warningUpper = addDaysIso(purgeCutoff, RETENTION_WARNING_DAYS);

  const { data: rows, error } = await db
    .from("chat_messages")
    .select("user_id")
    .gte("created_at", purgeCutoff)
    .lt("created_at", warningUpper)
    .limit(2000);

  if (error || !rows?.length) return 0;

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const periodKey = purgeCutoff.slice(0, 7);

  await createNotificationsBatch(
    userIds.map((userId) => ({
      userId,
      type: "system",
      titleKey: "notif.retention.warning_title",
      bodyKey: "notif.retention.warning_body",
      params: { days: RETENTION_WARNING_DAYS },
      dedupKey: `retention_warning:${periodKey}:${userId}`,
    })),
  );

  return userIds.length;
}

/** Runs GDPR retention purge across user data tables with budget + resume. */
export async function runRetentionPurge(): Promise<RetentionPurgeResult> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const chatCutoff = monthsAgoIso(RETENTION.chatMonths);
  const targets: PurgeTarget[] = [
    { table: "chat_messages", column: "created_at", cutoff: chatCutoff, idColumn: "id" },
    { table: "coaching_memory", column: "created_at", cutoff: chatCutoff, idColumn: "id" },
    {
      table: "analytics_daily",
      column: "entry_date",
      cutoff: monthsAgoDate(RETENTION.analyticsMonths),
      idColumn: "user_id",
      compositeDateColumn: "entry_date",
    },
    {
      table: "health_steps",
      column: "entry_date",
      cutoff: monthsAgoDate(RETENTION.healthStepsMonths),
      idColumn: "id",
    },
    {
      table: "ai_usage_ledger",
      column: "created_at",
      cutoff: monthsAgoIso(RETENTION.aiUsageLedgerMonths),
      idColumn: "id",
    },
    {
      table: "notifications",
      column: "created_at",
      cutoff: monthsAgoIso(RETENTION.notificationsMonths),
      idColumn: "id",
    },
    {
      table: "data_export_logs",
      column: "exported_at",
      cutoff: monthsAgoIso(RETENTION.dataExportLogsMonths),
      idColumn: "id",
    },
    {
      table: "admin_audit_log",
      column: "created_at",
      cutoff: daysAgoIso(RETENTION.adminAuditDays),
      idColumn: "id",
    },
    {
      table: "idempotency_keys",
      column: "expires_at",
      cutoff: new Date().toISOString(),
      idColumn: "id",
    },
  ];

  const saved = await cacheGet<PurgeCursor>(CURSOR_KEY);
  const resumedFromCursor = Boolean(saved);
  const tableIndex = saved?.tableIndex ?? 0;

  const deleted: Record<string, number> = Object.fromEntries(
    targets.map((t) => [t.table, 0]),
  );

  const budget = createExecutionBudget(PURGE_BUDGET_MS);

  const checkpoint = await runBatchedWithBudget<PurgeCursor>({
    budget,
    batchReserveMs: 2_000,
    initialCursor: { tableIndex },
    runBatch: async (cursor) => {
      const idx = cursor?.tableIndex ?? 0;
      if (idx >= targets.length) {
        return { nextCursor: null, processed: 0, done: true };
      }
      const target = targets[idx]!;
      const batch = await deleteBatch(db, target);
      deleted[target.table] = (deleted[target.table] ?? 0) + batch.deleted;

      if (batch.done) {
        const nextIndex = idx + 1;
        if (nextIndex >= targets.length) {
          return { nextCursor: null, processed: batch.deleted, done: true };
        }
        return {
          nextCursor: { tableIndex: nextIndex },
          processed: batch.deleted,
          done: false,
        };
      }

      return {
        nextCursor: { tableIndex: idx },
        processed: batch.deleted,
        done: false,
      };
    },
  });

  const complete = checkpoint.complete;
  if (complete) {
    await cacheDelete(CURSOR_KEY);
  } else if (checkpoint.cursor) {
    await cacheSet(CURSOR_KEY, checkpoint.cursor, CURSOR_TTL_SECONDS);
    logger.info("retention.purge partial — cursor saved", {
      cursor: checkpoint.cursor,
      batches: checkpoint.batches,
      processed: checkpoint.processed,
    });
  }

  const warningsSent = complete ? await sendRetentionWarnings() : 0;

  const ranAt = new Date().toISOString();
  const totalDeleted = Object.values(deleted).reduce((a, b) => a + b, 0);

  const { error: auditError } = await db.from("retention_purge_runs").insert({
    ran_at: ranAt,
    rows_deleted: totalDeleted,
    warnings_sent: warningsSent,
    detail: { ...deleted, complete, resumedFromCursor },
  });

  if (auditError) {
    logger.warn("retention.audit insert failed", { error: auditError.message });
  }

  return { ranAt, deleted, warningsSent, complete, resumedFromCursor };
}
