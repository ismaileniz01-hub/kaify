import { requireUser, type AuthedUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Ensures the current request is made by an authenticated user whose
 * `profiles.role = 'admin'`. Mirrors the DB-level `is_admin()` guard used by
 * RLS, so admin routes are protected on both the API and the data layer.
 */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("[admin-guard] role lookup error", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Yetki doğrulanamadı.");
  }

  if (data?.role !== "admin") {
    throw new ApiError("FORBIDDEN", "Bu işlem için yönetici yetkisi gerekir.");
  }

  return user;
}
