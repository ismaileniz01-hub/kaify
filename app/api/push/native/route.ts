import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { CONSENT_TYPES } from "@/lib/legal/constants";
import { assertConsent } from "@/lib/services/consent.service";
import {
  deleteNativeToken,
  saveNativeToken,
} from "@/lib/services/push.service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const registerSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["ios", "android"]),
});

/** POST /api/push/native — register Capacitor FCM token. */
export const POST = defineRoute(
  { route: "POST /api/push/native" },
  async ({ user, request }) => {
    await assertConsent(user.id, CONSENT_TYPES.PUSH_NOTIFICATIONS);

    const raw = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz token.", parsed.error.issues);
    }

    await saveNativeToken(user.id, parsed.data.platform, parsed.data.token);
    return { registered: true };
  },
);

const unregisterSchema = z.object({
  token: z.string().min(1).max(4096),
});

/** DELETE /api/push/native — remove Capacitor FCM token. */
export const DELETE = defineRoute(
  { route: "DELETE /api/push/native" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = unregisterSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz istek.", parsed.error.issues);
    }

    await deleteNativeToken(user.id, parsed.data.token);
    return { unregistered: true };
  },
);
