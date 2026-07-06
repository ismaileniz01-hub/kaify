import { verifyAdminHubSession } from "@/lib/auth/admin-hub-session";
import { requireUser, type AuthedUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/** Authenticated user with profiles.role = admin (no hub password yet). */
export async function requireAdminRole(): Promise<AuthedUser> {
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

export async function assertAdminHubUnlocked(userId: string): Promise<void> {
  const unlocked = await verifyAdminHubSession(userId);
  if (!unlocked) {
    throw new ApiError("FORBIDDEN", "Admin Hub şifresi gerekli.");
  }
}
