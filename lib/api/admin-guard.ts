import { assertAdminHubUnlocked, requireAdminRole } from "@/lib/api/admin-role";
import type { AuthedUser } from "@/lib/api/auth-guard";
import { assertAdminMfa } from "@/lib/auth/admin-mfa";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Admin role (+ ADMIN_EMAIL), enrolled TOTP at AAL2, then hub password session.
 */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireAdminRole();
  const supabase = await createServerSupabaseClient();
  await assertAdminMfa(supabase);
  await assertAdminHubUnlocked(user.id);
  return user;
}
