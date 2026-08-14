import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import {
  getUserSettings,
  upsertUserSettings,
} from "@/lib/services/settings.service";
import { PRIMARY_GOALS } from "@/lib/validations/goals.schema";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    workoutReminders: z.boolean(),
    /** Preferred name — maps to the same DB column as workoutReminders. */
    streakRiskReminders: z.boolean(),
    waterReminder: z.boolean(),
    soundEffects: z.boolean(),
    chatSounds: z.boolean(),
    unitSystem: z.enum(["metric", "imperial"]),
    leaderboardOptOut: z.boolean(),
    marketingEmails: z.boolean(),
    primaryGoal: z.enum(PRIMARY_GOALS).nullable(),
    goalsConfigured: z.boolean(),
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
    return withIdempotency({
      userId: user.id,
      endpoint: "PATCH /api/settings",
      key: getOptionalIdempotencyKey(request),
      requestBody: parsed.data,
      handler: () => upsertUserSettings(user.id, parsed.data),
    });
  },
);
