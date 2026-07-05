import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { CONSENT_TYPES } from "@/lib/legal/constants";
import { assertConsent } from "@/lib/services/consent.service";
import {
  deleteSubscription,
  saveSubscription,
} from "@/lib/services/push.service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

/** POST /api/push/subscribe — register this device for Web Push. */
export const POST = defineRoute(
  { route: "POST /api/push/subscribe" },
  async ({ user, request }) => {
    await assertConsent(user.id, CONSENT_TYPES.PUSH_NOTIFICATIONS);

    const raw = await request.json().catch(() => null);
    const parsed = subscriptionSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz abonelik.", parsed.error.issues);
    }

    const userAgent = request.headers.get("user-agent");
    await saveSubscription(user.id, parsed.data, userAgent);

    return { subscribed: true };
  },
);

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

/** DELETE /api/push/subscribe — remove this device's subscription. */
export const DELETE = defineRoute(
  { route: "DELETE /api/push/subscribe" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = unsubscribeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz istek.", parsed.error.issues);
    }

    await deleteSubscription(user.id, parsed.data.endpoint);
    return { unsubscribed: true };
  },
);
