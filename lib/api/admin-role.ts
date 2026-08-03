import { resolveIsHubAdmin } from "@/lib/auth/admin-access";
import { verifyAdminHubSession } from "@/lib/auth/admin-hub-session";
import { requireUser, type AuthedUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";

/**
 * Authenticated admin: profiles.role = admin and optional ADMIN_EMAIL allowlist.
 * Hub password / MFA are enforced separately by requireAdmin().
 */
export async function requireAdminRole(): Promise<AuthedUser> {
  const user = await requireUser();

  if (!(await resolveIsHubAdmin(user.id))) {
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
