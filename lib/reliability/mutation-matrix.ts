export type MutationIdempotencyClass = "A" | "B" | "C";

export type MutationMatrixRow = {
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE" | "PUT";
  retryable: boolean;
  clientKey: boolean;
  serverDedupe: boolean;
  dbUniqueness: boolean;
  class: MutationIdempotencyClass;
  safeIfRepeated: boolean;
  note: string;
};

/**
 * A = server Idempotency-Key store
 * B = inherently idempotent (DB unique / last-write-wins)
 * C = explicitly non-retried (webhooks use provider event id, OTP, etc.)
 */
export const MUTATION_IDEMPOTENCY_MATRIX: readonly MutationMatrixRow[] = [
  { endpoint: "POST /api/chat/messages/delete", method: "POST", retryable: true, clientKey: true, serverDedupe: false, dbUniqueness: false, class: "B", safeIfRepeated: true, note: "deleting already-gone ids is a no-op after first success" },
  { endpoint: "DELETE /api/chat/messages/[messageId]", method: "DELETE", retryable: true, clientKey: true, serverDedupe: false, dbUniqueness: false, class: "B", safeIfRepeated: true, note: "owned-row delete; repeat returns NOT_FOUND" },
  { endpoint: "POST /api/chat/[coachId]/analyze", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: false, class: "A", safeIfRepeated: true, note: "withIdempotency; body hash excludes raw base64, uses length+note" },
  { endpoint: "POST /api/chat/team", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: false, class: "A", safeIfRepeated: true, note: "withIdempotency" },
  { endpoint: "POST /api/analytics/confirm", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "pending row claim in confirm_analytics_pending" },
  { endpoint: "POST /api/analytics/workout-log", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: false, class: "A", safeIfRepeated: true, note: "withIdempotency; increment_analytics_workouts" },
  { endpoint: "PATCH /api/settings", method: "PATCH", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "LWW settings row + idempotency store" },
  { endpoint: "POST /api/consent", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: false, class: "A", safeIfRepeated: true, note: "append-only consent; key prevents double row on retry" },
  { endpoint: "DELETE /api/consent", method: "DELETE", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: false, class: "A", safeIfRepeated: true, note: "" },
  { endpoint: "POST /api/profile/avatar", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "Last avatar wins + idempotency replay" },
  { endpoint: "POST /api/check-in", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "daily unique + withIdempotency" },
  { endpoint: "POST /api/market/purchase", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "inventory PK + spend idempotency_key" },
  { endpoint: "POST /api/market/chest", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "" },
  { endpoint: "POST /api/referral", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: true, class: "A", safeIfRepeated: true, note: "" },
  { endpoint: "POST /api/gifts/claim", method: "POST", retryable: true, clientKey: true, serverDedupe: false, dbUniqueness: true, class: "B", safeIfRepeated: true, note: "claim_pending_gift unique" },
  { endpoint: "POST /api/webhooks/paddle", method: "POST", retryable: true, clientKey: false, serverDedupe: true, dbUniqueness: true, class: "C", safeIfRepeated: true, note: "provider_event_id claim; not client retried" },
  { endpoint: "POST /api/health/steps", method: "POST", retryable: true, clientKey: true, serverDedupe: false, dbUniqueness: true, class: "B", safeIfRepeated: true, note: "upsert user_id,entry_date,source" },
  { endpoint: "POST /api/onboarding", method: "POST", retryable: true, clientKey: true, serverDedupe: false, dbUniqueness: true, class: "B", safeIfRepeated: true, note: "complete_onboarding once" },
  { endpoint: "POST /api/support", method: "POST", retryable: true, clientKey: true, serverDedupe: true, dbUniqueness: false, class: "A", safeIfRepeated: true, note: "withIdempotency prevents double ticket messages" },
  { endpoint: "POST /api/auth/otp/send", method: "POST", retryable: false, clientKey: false, serverDedupe: false, dbUniqueness: false, class: "C", safeIfRepeated: false, note: "Rate-limited OTP; not mutation of canonical fitness state" },
  { endpoint: "POST /api/auth/password", method: "POST", retryable: false, clientKey: false, serverDedupe: false, dbUniqueness: false, class: "C", safeIfRepeated: false, note: "Password session for store reviewers; rate-limited" },
  { endpoint: "POST /api/auth/session/logout", method: "POST", retryable: true, clientKey: false, serverDedupe: false, dbUniqueness: false, class: "B", safeIfRepeated: true, note: "Expires cookies; repeating sign-out is a no-op" },
];

export function unsafeRetryMutations(): MutationMatrixRow[] {
  return MUTATION_IDEMPOTENCY_MATRIX.filter((r) => r.retryable && !r.safeIfRepeated);
}
