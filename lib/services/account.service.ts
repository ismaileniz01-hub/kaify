import type { SupabaseClient } from "@supabase/supabase-js";
import { purgeUserCaches } from "@/lib/cache/invalidate";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import {
  EXPORT_SCHEMA_VERSION,
  USER_EXPORT_TABLES,
  exportSchemaReadme,
} from "@/lib/compliance/export-tables";
import { fetchOwnedRowPage, fetchOwnedRowsPaged } from "@/lib/compliance/export-stream";
import { createDomainEvent } from "@/lib/events/types";
import { emitDomainEvent } from "@/lib/events/emit";
import { cancelUserSubscriptionsImmediately } from "@/lib/services/billing-portal.service";

/**
 * KVKK/GDPR account services.
 *
 * The app stores health data (steps, photo analysis, body scores), so users
 * have a legal right to (a) export all their data and (b) be forgotten. Both
 * operations run with the service-role client after the route authenticates
 * the caller and confirms they own the account.
 */

const AVATAR_BUCKET = "avatars";

export type UserDataExport = {
  schemaVersion: string;
  exportedAt: string;
  userId: string;
  authEmail: string | null;
  readme: Record<string, string>;
  profile: unknown;
  referralsMade: unknown;
  referralsReceived: unknown;
  data: Record<string, unknown[]>;
  complete: true;
};

export type ExportAuditContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Aggregates every row the app holds about a user into a single JSON document.
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const admin = createAdminSupabaseClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    throw new ApiError("NOT_FOUND", "Profil bulunamadı.");
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const authEmail = authUser.user?.email ?? null;

  const data: Record<string, unknown[]> = {};
  const db = admin as unknown as SupabaseClient;
  const failures: string[] = [];

  for (const { table, column, ownerRelation } of USER_EXPORT_TABLES) {
    try {
      data[table] = await fetchOwnedRowsPaged(
        db,
        table,
        column,
        userId,
        undefined,
        ownerRelation,
      );
    } catch (error) {
      failures.push(table);
      logger.warn("account.export table failed", {
        table,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  if (failures.length > 0) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Veri dışa aktarımı tamamlanamadı.",
      { failedTables: failures },
    );
  }

  const [{ data: referralsMade }, { data: referralsReceived }] = await Promise.all([
    admin.from("referrals").select("*").eq("referrer_id", userId),
    admin.from("referrals").select("*").eq("referred_id", userId),
  ]);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    authEmail,
    readme: exportSchemaReadme(),
    profile,
    referralsMade: referralsMade ?? [],
    referralsReceived: referralsReceived ?? [],
    data,
    complete: true,
  };
}

export async function logDataExportCounts(
  userId: string,
  rowCount: number,
  context: ExportAuditContext,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const { error } = await db.from("data_export_logs").insert({
    user_id: userId,
    ip_address: context.ipAddress ?? null,
    user_agent: context.userAgent ?? null,
    table_count: USER_EXPORT_TABLES.length,
    row_count: rowCount,
  });

  if (error) {
    logger.warn("account.export audit log failed", {
      userId,
      error: error.message,
    });
  }

  emitDomainEvent(
    createDomainEvent("account.exported", userId, {
      tableCount: USER_EXPORT_TABLES.length,
      rowCount,
    }, userId),
  );
}

/** Records a successful portability export for audit (Compliance Faz 2). */
export async function logDataExport(
  userId: string,
  payload: UserDataExport,
  context: ExportAuditContext,
): Promise<void> {
  const rowCount = Object.values(payload.data).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );
  await logDataExportCounts(userId, rowCount, context);
}

/**
 * Streams a complete JSON export. Memory is bounded to one page per table.
 * Mid-stream failure aborts without `complete: true` and without an audit log.
 */
export function streamUserDataExport(
  userId: string,
  context: ExportAuditContext,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const assembled = await exportUserDataHeaderAndStreamTables(
          userId,
          (chunk) => controller.enqueue(encoder.encode(chunk)),
        );
        await logDataExportCounts(userId, assembled.rowCount, context);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

async function exportUserDataHeaderAndStreamTables(
  userId: string,
  write: (chunk: string) => void,
): Promise<{ rowCount: number }> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    throw new ApiError("NOT_FOUND", "Profil bulunamadı.");
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const authEmail = authUser.user?.email ?? null;

  const referralsMade = await fetchOwnedRowsPaged(db, "referrals", "referrer_id", userId);
  const referralsReceived = await fetchOwnedRowsPaged(db, "referrals", "referred_id", userId);

  const header = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    authEmail,
    readme: exportSchemaReadme(),
    profile,
    referralsMade,
    referralsReceived,
  };
  write(`${JSON.stringify(header).slice(0, -1)},"data":{`);

  let rowCount = 0;
  for (let i = 0; i < USER_EXPORT_TABLES.length; i++) {
    const spec = USER_EXPORT_TABLES[i]!;
    if (i > 0) write(",");
    write(`${JSON.stringify(spec.table)}:[`);
    let from = 0;
    let first = true;
    for (;;) {
      const page = await fetchOwnedRowPage(
        db,
        spec.table,
        spec.column,
        userId,
        from,
        undefined,
        spec.ownerRelation,
      );
      for (const row of page.rows) {
        if (!first) write(",");
        first = false;
        write(JSON.stringify(row));
        rowCount += 1;
      }
      if (page.complete) break;
      from += page.rows.length || 200;
      if (rowCount > 100_000) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Veri dışa aktarımı bu hesap için çok büyük. Lütfen destek ile iletişime geç.",
        );
      }
    }
    write("]");
  }

  write(`},"complete":true}`);
  return { rowCount };
}

/**
 * Permanently deletes the user's auth identity. The `profiles.id -> auth.users`
 * FK cascades to every child table (streaks, ledger, chat, analytics, ...), so
 * removing the auth user erases all application data. Storage objects are not
 * covered by the FK cascade and are removed explicitly.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await cancelUserSubscriptionsImmediately(userId);

  const admin = createAdminSupabaseClient();

  try {
    const { data: files } = await admin.storage
      .from(AVATAR_BUCKET)
      .list(userId);
    if (files && files.length > 0) {
      await admin.storage
        .from(AVATAR_BUCKET)
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch (error) {
    logger.warn("account.delete avatar cleanup failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    logger.error("account.delete auth deletion failed", {
      userId,
      error: error.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Hesap silinemedi.");
  }

  // Erasure requires active cache purge — do not rely on TTL alone.
  try {
    await purgeUserCaches(userId);
  } catch (cacheError) {
    logger.warn("account.delete cache purge failed", {
      userId,
      error: cacheError instanceof Error ? cacheError.message : "unknown",
    });
  }

  logger.info("account.delete completed", { userId });
  emitDomainEvent(createDomainEvent("account.deleted", userId, {}, userId));
}
