import { ApiError } from "@/lib/api/errors";
import { getPaddleServerClient, isPaddleServerConfigured } from "@/lib/billing/paddle-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Mint a Paddle-hosted customer portal session for the signed-in Kaify user.
 * Customer ID is resolved server-side from mirrored webhook state — never from the client.
 */
export async function createCustomerPortalUrl(userId: string): Promise<string> {
  if (!isPaddleServerConfigured()) {
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      "Billing portal is not configured yet.",
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: customer, error: customerError } = await admin
    .from("paddle_customers")
    .select("customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (customerError) throw customerError;
  if (!customer?.customer_id) {
    throw new ApiError(
      "NOT_FOUND",
      "No Paddle customer is linked to this account yet. Complete a purchase first.",
    );
  }

  const { data: subscriptions, error: subError } = await admin
    .from("paddle_subscriptions")
    .select("subscription_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (subError) throw subError;

  const subscriptionIds = (subscriptions ?? [])
    .map((row) => row.subscription_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const paddle = getPaddleServerClient();
  const session = await paddle.customerPortalSessions.create(
    customer.customer_id,
    subscriptionIds,
  );

  const url = session.urls?.general?.overview;
  if (!url) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Paddle did not return a portal URL.",
    );
  }
  return url;
}
