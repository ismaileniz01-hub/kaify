import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Operator hub visibility: role=admin AND optional ADMIN_EMAIL match. */
export async function resolveIsHubAdmin(userId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") return false;

  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) return true;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  return authUser.user?.email?.toLowerCase() === allowedEmail;
}
