export const PRODUCT_EVENT_NAMES = [
  "acquisition.landing_viewed",
  "acquisition.pricing_viewed",
  "acquisition.cta_clicked",
  "acquisition.utm_captured",
  "native.first_opened",
  "native.app_resumed",
  "native.deep_link_received",
  "native.deep_link_resolved",
  "native.deep_link_failed",
  "signup.started",
  "signup.otp_requested",
  "signup.otp_verified",
  "signup.completed",
  "signup.failed",
  "onboarding.started",
  "onboarding.step_viewed",
  "onboarding.step_completed",
  "onboarding.step_skipped",
  "onboarding.completed",
  "onboarding.abandoned",
  "activation.action_completed",
  "activation.first_workout_completed",
  "activation.first_meal_logged",
  "activation.first_scan_confirmed",
  "activation.first_chat_action_completed",
  "session.started",
  "session.daily_job_viewed",
  "session.daily_job_completed",
  "session.weekly_review_viewed",
  "session.weekly_review_completed",
  "session.next_action_completed",
  "notification.eligible",
  "notification.scheduled",
  "notification.sent",
  "notification.delivered",
  "notification.opened",
  "notification.dismissed",
  "notification.preference_changed",
  "notification.permission_changed",
  "billing.checkout_started",
  "billing.checkout_completed",
  "billing.subscription_activated",
  "billing.renewal_succeeded",
  "billing.renewal_failed",
  "billing.cancel_requested",
  "billing.cancel_completed",
  "billing.refund_applied",
  "billing.dispute_updated",
  "reactivation.eligible",
  "reactivation.return_session_started",
  "reactivation.recovery_task_shown",
  "reactivation.recovery_task_completed",
  "referral.shared",
  "referral.clicked",
  "referral.signup_completed",
  "referral.paid",
  "scan.result_shown",
  "scan.low_confidence",
  "scan.corrected",
  "scan.rejected",
  "scan.retry_started",
  "scan.retry_completed",
  "scan.ai_safety_escalated",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const PRODUCT_EVENT_NAME_SET = new Set<string>(PRODUCT_EVENT_NAMES);

const SHARED_KEYS = [
  "platform",
  "locale",
  "schema_version",
] as const;

export const EVENT_PROPERTY_ALLOWLIST: Record<ProductEventName, readonly string[]> = {
  "acquisition.landing_viewed": [...SHARED_KEYS, "page"],
  "acquisition.pricing_viewed": [...SHARED_KEYS, "page"],
  "acquisition.cta_clicked": [...SHARED_KEYS, "page", "cta"],
  "acquisition.utm_captured": [...SHARED_KEYS, "source", "medium", "campaign"],
  "native.first_opened": [...SHARED_KEYS, "os", "app_version", "build"],
  "native.app_resumed": [...SHARED_KEYS, "os", "app_version"],
  "native.deep_link_received": [...SHARED_KEYS, "route"],
  "native.deep_link_resolved": [...SHARED_KEYS, "route", "result"],
  "native.deep_link_failed": [...SHARED_KEYS, "route", "error"],
  "signup.started": [...SHARED_KEYS, "flow", "method"],
  "signup.otp_requested": [...SHARED_KEYS, "flow", "method"],
  "signup.otp_verified": [...SHARED_KEYS, "flow", "method"],
  "signup.completed": [...SHARED_KEYS, "flow", "method"],
  "signup.failed": [...SHARED_KEYS, "flow", "error"],
  "onboarding.started": [...SHARED_KEYS, "flow", "version"],
  "onboarding.step_viewed": [...SHARED_KEYS, "flow", "step"],
  "onboarding.step_completed": [...SHARED_KEYS, "flow", "step", "elapsed_bucket"],
  "onboarding.step_skipped": [...SHARED_KEYS, "flow", "step"],
  "onboarding.completed": [...SHARED_KEYS, "flow", "version"],
  "onboarding.abandoned": [...SHARED_KEYS, "flow", "step"],
  "activation.action_completed": [...SHARED_KEYS, "action", "first"],
  "activation.first_workout_completed": [...SHARED_KEYS, "action", "first"],
  "activation.first_meal_logged": [...SHARED_KEYS, "action", "first"],
  "activation.first_scan_confirmed": [...SHARED_KEYS, "action", "first"],
  "activation.first_chat_action_completed": [...SHARED_KEYS, "action", "first"],
  "session.started": [...SHARED_KEYS, "session_kind"],
  "session.daily_job_viewed": [...SHARED_KEYS, "job"],
  "session.daily_job_completed": [...SHARED_KEYS, "job"],
  "session.weekly_review_viewed": [...SHARED_KEYS, "review_version"],
  "session.weekly_review_completed": [...SHARED_KEYS, "review_version"],
  "session.next_action_completed": [...SHARED_KEYS, "action"],
  "notification.eligible": [...SHARED_KEYS, "type", "channel"],
  "notification.scheduled": [...SHARED_KEYS, "type", "channel"],
  "notification.sent": [...SHARED_KEYS, "type", "channel", "status"],
  "notification.delivered": [...SHARED_KEYS, "type", "channel", "status"],
  "notification.opened": [...SHARED_KEYS, "type", "channel"],
  "notification.dismissed": [...SHARED_KEYS, "type", "channel"],
  "notification.preference_changed": [...SHARED_KEYS, "preference", "enabled"],
  "notification.permission_changed": [...SHARED_KEYS, "permission"],
  "billing.checkout_started": [...SHARED_KEYS, "plan", "interval"],
  "billing.checkout_completed": [...SHARED_KEYS, "plan", "state"],
  "billing.subscription_activated": [...SHARED_KEYS, "plan", "state"],
  "billing.renewal_succeeded": [...SHARED_KEYS, "plan", "state"],
  "billing.renewal_failed": [...SHARED_KEYS, "plan", "state"],
  "billing.cancel_requested": [...SHARED_KEYS, "plan", "state"],
  "billing.cancel_completed": [...SHARED_KEYS, "plan", "state"],
  "billing.refund_applied": [...SHARED_KEYS, "plan", "state"],
  "billing.dispute_updated": [...SHARED_KEYS, "plan", "state"],
  "reactivation.eligible": [...SHARED_KEYS, "inactivity_bucket"],
  "reactivation.return_session_started": [...SHARED_KEYS, "inactivity_bucket"],
  "reactivation.recovery_task_shown": [...SHARED_KEYS, "task", "inactivity_bucket"],
  "reactivation.recovery_task_completed": [...SHARED_KEYS, "task"],
  "referral.shared": [...SHARED_KEYS, "channel", "campaign_id"],
  "referral.clicked": [...SHARED_KEYS, "channel", "campaign_id"],
  "referral.signup_completed": [...SHARED_KEYS, "campaign_id"],
  "referral.paid": [...SHARED_KEYS, "campaign_id"],
  "scan.result_shown": [...SHARED_KEYS, "scan_type", "confidence_bucket", "model"],
  "scan.low_confidence": [...SHARED_KEYS, "scan_type", "confidence_bucket"],
  "scan.corrected": [...SHARED_KEYS, "scan_type", "action"],
  "scan.rejected": [...SHARED_KEYS, "scan_type", "action"],
  "scan.retry_started": [...SHARED_KEYS, "scan_type"],
  "scan.retry_completed": [...SHARED_KEYS, "scan_type"],
  "scan.ai_safety_escalated": [...SHARED_KEYS, "category"],
};

export const FORBIDDEN_PROPERTY_KEYS = [
  "email",
  "otp",
  "token",
  "password",
  "image",
  "photo",
  "url",
  "text",
  "message",
  "prompt",
  "completion",
  "referral_code",
  "code",
  "ip",
  "name",
  "phone",
  "query",
  "referrer",
  "payload",
  "diagnosis",
  "symptom",
  "narrative",
  "body",
  "title",
] as const;

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_PROPERTY_KEYS);

export type ProductEventInput = {
  name: ProductEventName;
  userId?: string | null;
  installId?: string | null;
  platform?: string | null;
  properties?: Record<string, unknown>;
  idempotencyKey: string;
  occurredAt?: string;
};

export type SanitizedProductEvent = {
  event_name: ProductEventName;
  user_id: string | null;
  install_id: string | null;
  platform: string | null;
  schema_version: number;
  properties: Record<string, string | number | boolean>;
  idempotency_key: string;
  occurred_at: string;
};

export function isForbiddenPropertyKey(key: string): boolean {
  return FORBIDDEN_SET.has(key.toLowerCase());
}

function asScalar(value: unknown): string | number | boolean | null {
  if (typeof value === "string") {
    const trimmed = value.trim().slice(0, 64);
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return null;
}

export function sanitizeProductEvent(
  input: ProductEventInput,
): SanitizedProductEvent | { error: string } {
  if (!PRODUCT_EVENT_NAME_SET.has(input.name)) {
    return { error: "unknown_event" };
  }
  const allow = new Set(EVENT_PROPERTY_ALLOWLIST[input.name]);
  const properties: Record<string, string | number | boolean> = {};
  for (const [rawKey, rawValue] of Object.entries(input.properties ?? {})) {
    const key = rawKey.trim();
    if (!key) continue;
    if (isForbiddenPropertyKey(key) || !allow.has(key)) {
      return { error: `forbidden_or_unknown_key:${key}` };
    }
    const value = asScalar(rawValue);
    if (value == null) {
      return { error: `invalid_value:${key}` };
    }
    properties[key] = value;
  }

  const installId =
    typeof input.installId === "string" &&
    /^[0-9a-f-]{36}$/i.test(input.installId)
      ? input.installId.toLowerCase()
      : null;

  return {
    event_name: input.name,
    user_id: input.userId ?? null,
    install_id: installId,
    platform: asScalar(input.platform) as string | null,
    schema_version: 1,
    properties,
    idempotency_key: input.idempotencyKey.slice(0, 180),
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  };
}
