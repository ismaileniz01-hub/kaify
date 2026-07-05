import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import {
  EXPORT_SCHEMA_VERSION,
  USER_EXPORT_TABLES,
  exportSchemaReadme,
} from "@/lib/compliance/export-tables";
import { createDomainEvent } from "@/lib/events/types";
import { emitDomainEvent } from "@/lib/events/emit";

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

  await Promise.all(
    USER_EXPORT_TABLES.map(async ({ table, column }) => {
      const { data: rows, error } = await db
        .from(table)
        .select("*")
        .eq(column, userId);
      if (error) {
        logger.warn("account.export table failed", {
          table,
          error: error.message,
        });
      }
      data[table] = rows ?? [];
    }),
  );

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
  };
}

/** Records a successful portability export for audit (Compliance Faz 2). */
export async function logDataExport(
  userId: string,
  payload: UserDataExport,
  context: ExportAuditContext,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;

  const rowCount = Object.values(payload.data).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );

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

/**
 * Permanently deletes the user's auth identity. The `profiles.id -> auth.users`
 * FK cascades to every child table (streaks, ledger, chat, analytics, ...), so
 * removing the auth user erases all application data. Storage objects are not
 * covered by the FK cascade and are removed explicitly.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
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

  logger.info("account.delete completed", { userId });
  emitDomainEvent(createDomainEvent("account.deleted", userId, {}, userId));
}
