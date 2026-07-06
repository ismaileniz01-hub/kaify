import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/types/database.types";

type ManifestTable =
  | "profiles"
  | "user_streaks"
  | "gem_ledger"
  | "chat_messages"
  | "analytics_daily";

/** Critical tables included in daily DR manifest snapshots. */
export const BACKUP_MANIFEST_TABLES: readonly ManifestTable[] = [
  "profiles",
  "user_streaks",
  "gem_ledger",
  "chat_messages",
  "analytics_daily",
] as const;

export type BackupManifest = {
  tables: Record<string, number | null>;
  storage: { avatarsObjectCount: number | null };
  migrations: { count: number | null; latestVersion: string | null };
  gitRelease: string | null;
};

export type BackupVerificationResult = {
  status: "ok" | "degraded" | "error";
  manifest: BackupManifest;
  errors: string[];
};

async function countTable(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  table: ManifestTable,
): Promise<number | null> {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) {
    logger.warn("[backup] table count failed", { table, error: error.message });
    return null;
  }
  return count ?? 0;
}

/**
 * Captures a daily DR manifest: row counts, storage probe, deploy SHA.
 * Compare consecutive runs to detect silent data loss before restore is needed.
 */
export async function runBackupVerification(): Promise<BackupVerificationResult> {
  const admin = createAdminSupabaseClient();
  const errors: string[] = [];
  const tables: Record<string, number | null> = {};

  for (const table of BACKUP_MANIFEST_TABLES) {
    tables[table] = await countTable(admin, table);
    if (tables[table] === null) errors.push(`count_failed:${table}`);
  }

  let avatarsObjectCount: number | null = null;
  try {
    const { data, error } = await admin.storage.from("avatars").list("", { limit: 1000 });
    if (error) errors.push(`storage_list:${error.message}`);
    else avatarsObjectCount = data?.length ?? 0;
  } catch (e) {
    errors.push(`storage_exception:${e instanceof Error ? e.message : "unknown"}`);
  }

  const manifest: BackupManifest = {
    tables,
    storage: { avatarsObjectCount },
    migrations: { count: null, latestVersion: null },
    gitRelease: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  };

  const failedCounts = Object.values(tables).filter((v) => v === null).length;
  let status: BackupVerificationResult["status"] = "ok";
  if (failedCounts === BACKUP_MANIFEST_TABLES.length) status = "error";
  else if (failedCounts > 0 || errors.length > 0) status = "degraded";

  return { status, manifest, errors };
}

export async function persistBackupVerification(
  result: BackupVerificationResult,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("backup_verification_runs").insert({
    status: result.status,
    migration_count: result.manifest.migrations.count,
    manifest: result.manifest as Json,
    detail: result.errors.length > 0 ? result.errors.join("; ") : null,
  });
  if (error) {
    logger.error("[backup] persist failed", { error: error.message });
    throw error;
  }
}
