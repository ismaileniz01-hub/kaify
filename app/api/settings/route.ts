import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import {
  getUserSettings,
  upsertUserSettings,
} from "@/lib/services/settings.service";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    workoutReminders: z.boolean(),
    waterReminder: z.boolean(),
    soundEffects: z.boolean(),
    chatSounds: z.boolean(),
    unitSystem: z.enum(["metric", "imperial"]),
    leaderboardOptOut: z.boolean(),
  })
  .partial()
  .strict();

/** GET /api/settings */
export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getUserSettings(user.id);
    return ok(settings);
  } catch (error) {
    return handleApiError(error, { route: "/api/settings" });
  }
}

/** PATCH /api/settings */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const raw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz ayar.", parsed.error.issues);
    }
    const settings = await upsertUserSettings(user.id, parsed.data);
    return ok(settings);
  } catch (error) {
    return handleApiError(error, { route: "/api/settings" });
  }
}
