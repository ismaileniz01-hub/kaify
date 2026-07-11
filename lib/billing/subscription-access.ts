/**
 * Whether a Paddle subscription status currently grants paid app access.
 *
 * `scheduled_change` to cancel/pause must NOT revoke access — only the real
 * `status` matters. `paused` / `past_due` keep access until explicitly canceled
 * (grace / retain behavior).
 */
export function subscriptionGrantsAccess(
  status: string | null | undefined,
): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "active" || normalized === "trialing";
}

export function subscriptionIsCanceled(
  status: string | null | undefined,
): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}
