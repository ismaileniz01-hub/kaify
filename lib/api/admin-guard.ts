import { assertAdminHubUnlocked, requireAdminRole } from "@/lib/api/admin-role";
import type { AuthedUser } from "@/lib/api/auth-guard";

/**
 * Ensures admin role + hub password session (replaces MFA for operator UI).
 */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireAdminRole();
  await assertAdminHubUnlocked(user.id);
  return user;
}
