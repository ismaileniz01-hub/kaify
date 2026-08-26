import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import { incrementTodayWorkout } from "@/lib/services/analytics.service";
import { logWorkoutSession } from "@/lib/services/workout-plan.service";
import { featureFlags } from "@/lib/feature-flags";
import {
  MAX_JSON_BODY_CHAT,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    exerciseKey: z.string().min(1).max(120).optional(),
    reps: z.number().int().min(0).max(50).optional(),
    loadKg: z.number().min(0).max(500).optional(),
    sets: z.number().int().min(1).max(8).optional(),
  })
  .optional();

/** POST /api/analytics/workout-log — atomic workouts_completed + 1. */
export const POST = defineRoute(
  { route: "POST /api/analytics/workout-log", rateLimit: "checkin" },
  async ({ user, request }) => {
    const raw = await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT).catch(
      () => null,
    );
    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz antrenman kaydı.", parsed.error.issues);
    }

    const key = getOptionalIdempotencyKey(request);
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/analytics/workout-log",
      key,
      requestBody: parsed.data ?? {},
      handler: async () => {
        const payload = parsed.data ?? {};
        if (featureFlags.workoutPlans() && payload.exerciseKey) {
          const loggedSets = Array.from({ length: payload.sets ?? 1 }, () => ({
            exerciseKey: payload.exerciseKey!,
            reps: payload.reps ?? 0,
            loadKg: payload.loadKg ?? 0,
          }));
          return logWorkoutSession({
            userId: user.id,
            status: "completed",
            sets: loggedSets,
          });
        }
        const workoutsCompleted = await incrementTodayWorkout(user.id);
        return { ok: true as const, workoutsCompleted };
      },
    });
  },
);
