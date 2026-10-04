import { assertAdminHubUnlocked, requireAdminRole } from "@/lib/api/admin-role";
import type { AuthedUser } from "@/lib/api/auth-guard";
import { requireMfaIfEnrolled } from "@/lib/auth/mfa-server";

/**
 * Admin role (+ ADMIN_EMAIL), hub password, then AAL2 only when TOTP is enrolled.
 * Email OTP never reaches AAL2 by itself. Requiring a TOTP enrollment here hid
 * the support inbox behind "You don't have permission to do this."
 */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireAdminRole();
  await assertAdminHubUnlocked(user.id);
  await requireMfaIfEnrolled();
  return user;
}
