import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
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
export const GET = defineRoute(
  { route: "GET /api/settings" },
  async ({ user }) => getUserSettings(user.id),
);

/** PATCH /api/settings */
export const PATCH = defineRoute(
  { route: "PATCH /api/settings" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz ayar.", parsed.error.issues);
    }
    return upsertUserSettings(user.id, parsed.data);
  },
);
