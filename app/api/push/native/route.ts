import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
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
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const raw = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz token.", parsed.error.issues);
    }

    await saveNativeToken(user.id, parsed.data.platform, parsed.data.token);
    return ok({ registered: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/push/native" });
  }
}

const unregisterSchema = z.object({
  token: z.string().min(1).max(4096),
});

/** DELETE /api/push/native — remove Capacitor FCM token. */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();

    const raw = await request.json().catch(() => null);
    const parsed = unregisterSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz istek.", parsed.error.issues);
    }

    await deleteNativeToken(user.id, parsed.data.token);
    return ok({ unregistered: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/push/native" });
  }
}
