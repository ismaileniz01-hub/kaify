import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { emitProductEvent, productEventIdempotencyKey } from "@/lib/events/product";
import {
  PRODUCT_EVENT_NAME_SET,
  sanitizeProductEvent,
  type ProductEventName,
} from "@/lib/events/product-catalog";
import { hasAnalyticsConsentHeader } from "@/lib/events/client-consent";

export const runtime = "nodejs";

const CLIENT_EVENTS = new Set<ProductEventName>([
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
  "onboarding.step_viewed",
  "onboarding.step_skipped",
  "session.weekly_review_viewed",
  "session.weekly_review_completed",
  "session.next_action_completed",
  "referral.clicked",
  "referral.shared",
  "billing.checkout_started",
]);

const ACQUISITION_EVENTS = new Set(
  [...CLIENT_EVENTS].filter((name) => name.startsWith("acquisition.")),
);

const bodySchema = z.object({
  name: z.string(),
  installId: z.string().uuid().optional(),
  platform: z.enum(["web", "android", "ios"]).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(8).max(180).optional(),
});

/** POST /api/events — allowlisted client beacons. Acquisition requires analytics consent. */
export const POST = defineRoute(
  {
    route: "POST /api/events",
    auth: "none",
    publicRateLimit: "public_media",
    requireCsrf: false,
  },
  async ({ request, user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid event.", parsed.error.issues);
    }
    const name = parsed.data.name;
    if (!PRODUCT_EVENT_NAME_SET.has(name) || !CLIENT_EVENTS.has(name as ProductEventName)) {
      throw new ApiError("FORBIDDEN", "Event is not client-allowlisted.");
    }
    const eventName = name as ProductEventName;
    if (ACQUISITION_EVENTS.has(eventName) && !hasAnalyticsConsentHeader(request)) {
      return { accepted: false, reason: "consent_required" as const };
    }

    const sanitized = sanitizeProductEvent({
      name: eventName,
      userId: user.id || null,
      installId: parsed.data.installId,
      platform: parsed.data.platform,
      properties: parsed.data.properties,
      idempotencyKey:
        parsed.data.idempotencyKey ??
        productEventIdempotencyKey([
          eventName,
          parsed.data.installId,
          JSON.stringify(parsed.data.properties ?? {}),
        ]),
    });
    if ("error" in sanitized) {
      throw new ApiError("FORBIDDEN", "Event payload rejected.");
    }

    emitProductEvent({
      name: eventName,
      userId: user.id || null,
      installId: parsed.data.installId,
      platform: parsed.data.platform,
      properties: parsed.data.properties,
      idempotencyKey: sanitized.idempotency_key,
    });
    return { accepted: true as const };
  },
);
