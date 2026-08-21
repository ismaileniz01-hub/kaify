import { ApiError } from "@/lib/api/errors";
import { getPaddleServerClient, isPaddleServerConfigured } from "@/lib/billing/paddle-server";
import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Mint a Paddle-hosted customer portal session for the signed-in Kaify Ai user.
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

function isAlreadyCanceledStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}

function isBenignCancelError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("canceled") ||
    lower.includes("cancelled") ||
    lower.includes("not found") ||
    lower.includes("404")
  );
}

/**
 * Stop live Paddle billing before the auth user is erased.
 * No-ops when the account has no mirrored subscriptions.
 */
export async function cancelUserSubscriptionsImmediately(
  userId: string,
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from("paddle_subscriptions")
    .select("subscription_id, status")
    .eq("user_id", userId);

  if (error) throw error;

  const liveIds = (rows ?? [])
    .filter(
      (row) =>
        typeof row.subscription_id === "string" &&
        row.subscription_id.length > 0 &&
        !isAlreadyCanceledStatus(row.status),
    )
    .map((row) => row.subscription_id as string);

  if (liveIds.length === 0) return;

  if (!isPaddleServerConfigured()) {
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      "Cannot stop billing before deleting this account. Open Manage billing, or try again later.",
    );
  }

  const paddle = getPaddleServerClient();
  const failures: string[] = [];

  for (const subscriptionId of liveIds) {
    try {
      await paddle.subscriptions.cancel(subscriptionId, {
        effectiveFrom: "immediately",
      });
    } catch (error) {
      if (isBenignCancelError(error)) continue;
      logger.error("[billing] cancel on delete failed", {
        userId,
        subscriptionId,
        error: error instanceof Error ? error.message : "unknown",
      });
      failures.push(subscriptionId);
    }
  }

  if (failures.length > 0) {
    throw new ApiError(
      "CONFLICT",
      "Could not stop billing. Cancel your plan in Manage billing, then delete the account.",
    );
  }
}
