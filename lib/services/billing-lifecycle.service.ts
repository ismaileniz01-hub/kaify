import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatTierLabel } from "@/lib/billing/tier-labels";
import { hasPaidPlan } from "@/lib/auth/post-auth-redirect";
import { getOwnProfile } from "@/lib/services/profile.service";

export type SubscriptionLifecycleDTO = {
  status: string;
  planLabel: string;
  paid: boolean;
  endsAt: string | null;
  scheduledChange: string | null;
  scheduledChangeAt: string | null;
};

export async function getSubscriptionLifecycle(
  userId: string,
): Promise<SubscriptionLifecycleDTO> {
  const profile = await getOwnProfile(userId);
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("paddle_subscriptions")
    .select("status, scheduled_change_action, scheduled_change_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    status: data?.status ?? (hasPaidPlan(profile) ? "active" : "none"),
    planLabel: formatTierLabel(profile.tier),
    paid: hasPaidPlan(profile),
    endsAt: data?.scheduled_change_at ?? null,
    scheduledChange: data?.scheduled_change_action ?? null,
    scheduledChangeAt: data?.scheduled_change_at ?? null,
  };
}
