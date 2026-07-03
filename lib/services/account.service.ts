import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

/**
 * KVKK/GDPR account services.
 *
 * The app stores health data (steps, photo analysis, body scores), so users
 * have a legal right to (a) export all their data and (b) be forgotten. Both
 * operations run with the service-role client after the route authenticates
 * the caller and confirms they own the account.
 */

const AVATAR_BUCKET = "avatars";

/** User-owned tables collected for the data export (right to portability). */
const EXPORT_TABLES = [
  { table: "gem_ledger", column: "user_id" },
  { table: "user_streaks", column: "user_id" },
  { table: "user_kai_state", column: "user_id" },
  { table: "user_usage_counters", column: "user_id" },
  { table: "usage_events", column: "user_id" },
  { table: "chat_messages", column: "user_id" },
  { table: "user_coaching_state", column: "user_id" },
  { table: "coaching_memory", column: "user_id" },
  { table: "analytics_daily", column: "user_id" },
  { table: "health_steps", column: "user_id" },
  { table: "user_market_inventory", column: "user_id" },
  { table: "user_settings", column: "user_id" },
  { table: "referral_events", column: "referrer_id" },
] as const;

export type UserDataExport = {
  exportedAt: string;
  userId: string;
  profile: unknown;
  referralsMade: unknown;
  data: Record<string, unknown[]>;
};

/**
 * Aggregates every row the app holds about a user into a single JSON document.
 * Returns null for the profile only when the account no longer exists.
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

  const data: Record<string, unknown[]> = {};
  // Untyped view for the dynamic table/column loop (union table names would
  // otherwise collapse column types to `never`).
  const db = admin as unknown as SupabaseClient;

  await Promise.all(
    EXPORT_TABLES.map(async ({ table, column }) => {
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

  const { data: referralsMade } = await admin
    .from("referrals")
    .select("*")
    .eq("referrer_id", userId);

  return {
    exportedAt: new Date().toISOString(),
    userId,
    profile,
    referralsMade: referralsMade ?? [],
    data,
  };
}

/**
 * Permanently deletes the user's auth identity. The `profiles.id -> auth.users`
 * FK cascades to every child table (streaks, ledger, chat, analytics, ...), so
 * removing the auth user erases all application data. Storage objects are not
 * covered by the FK cascade and are removed explicitly.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();

  // Best-effort avatar cleanup (storage is outside the FK cascade).
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
}
