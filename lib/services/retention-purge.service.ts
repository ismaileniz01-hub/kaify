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

export type RetentionPurgeResult = {
  ranAt: string;
  deleted: Record<string, number>;
  warningsSent: number;
};

async function deleteWhereOlder(
  db: SupabaseClient,
  table: string,
  column: string,
  cutoff: string,
  selectColumn = "id",
): Promise<number> {
  const { data, error } = await db
    .from(table)
    .delete()
    .lt(column, cutoff)
    .select(selectColumn);

  if (error) {
    logger.warn("retention.purge failed", { table, error: error.message });
    return 0;
  }
  return data?.length ?? 0;
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
    .lt("created_at", warningUpper);

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

/** Runs GDPR retention purge across user data tables. */
export async function runRetentionPurge(): Promise<RetentionPurgeResult> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const chatCutoff = monthsAgoIso(RETENTION.chatMonths);

  const deleted: Record<string, number> = {
    chat_messages: await deleteWhereOlder(db, "chat_messages", "created_at", chatCutoff),
    coaching_memory: await deleteWhereOlder(db, "coaching_memory", "created_at", chatCutoff),
    analytics_daily: await deleteWhereOlder(
      db,
      "analytics_daily",
      "entry_date",
      monthsAgoDate(RETENTION.analyticsMonths),
      "user_id",
    ),
    health_steps: await deleteWhereOlder(
      db,
      "health_steps",
      "entry_date",
      monthsAgoDate(RETENTION.healthStepsMonths),
      "id",
    ),
    ai_usage_ledger: await deleteWhereOlder(
      db,
      "ai_usage_ledger",
      "created_at",
      monthsAgoIso(RETENTION.aiUsageLedgerMonths),
    ),
    notifications: await deleteWhereOlder(
      db,
      "notifications",
      "created_at",
      monthsAgoIso(RETENTION.notificationsMonths),
    ),
    data_export_logs: await deleteWhereOlder(
      db,
      "data_export_logs",
      "exported_at",
      monthsAgoIso(RETENTION.dataExportLogsMonths),
    ),
    admin_audit_log: await deleteWhereOlder(
      db,
      "admin_audit_log",
      "created_at",
      daysAgoIso(RETENTION.adminAuditDays),
    ),
    idempotency_keys: await deleteWhereOlder(
      db,
      "idempotency_keys",
      "expires_at",
      new Date().toISOString(),
    ),
  };

  const warningsSent = await sendRetentionWarnings();

  const ranAt = new Date().toISOString();
  const totalDeleted = Object.values(deleted).reduce((a, b) => a + b, 0);

  const { error: auditError } = await db.from("retention_purge_runs").insert({
    ran_at: ranAt,
    rows_deleted: totalDeleted,
    warnings_sent: warningsSent,
    detail: deleted,
  });

  if (auditError) {
    logger.warn("retention.audit insert failed", { error: auditError.message });
  }

  return { ranAt, deleted, warningsSent };
}
