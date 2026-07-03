import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { resolveDisplayName } from "@/lib/supabase/profile-compat";

/**
 * Immutable admin action trail. Every privileged operation (and sensitive PII
 * read) is recorded with who/what/when/where. Writes go through the service-role
 * client; the table is read-only for admins via RLS. Audit failures never break
 * the underlying request — they are logged and swallowed.
 */
export type AdminAuditEntry = {
  adminId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

export type AdminAuditRow = {
  id: string;
  adminId: string | null;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
};

export async function recordAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("admin_audit_log").insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: (entry.metadata ?? null) as never,
      ip: entry.ip ?? null,
    });
    if (error) {
      logger.warn("audit write failed", { action: entry.action, error: error.message });
    }
  } catch (error) {
    logger.warn("audit write threw", {
      action: entry.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/** Recent admin audit entries (admin session + RLS). */
export async function listAuditLog(limit = 50): Promise<AdminAuditRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, admin_id, action, target_type, target_id, metadata, ip, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("[audit] list error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Audit kayıtları alınamadı.");
  }

  const adminIds = [
    ...new Set((data ?? []).map((r) => r.admin_id).filter(Boolean)),
  ] as string[];

  const names = new Map<string, string>();
  if (adminIds.length > 0) {
    const admin = createAdminSupabaseClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", adminIds);
    for (const p of profiles ?? []) {
      names.set(p.id, resolveDisplayName(p as Parameters<typeof resolveDisplayName>[0]));
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_id ? (names.get(row.admin_id) ?? row.admin_id.slice(0, 8)) : "system",
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    ip: row.ip,
    createdAt: row.created_at,
  }));
}
