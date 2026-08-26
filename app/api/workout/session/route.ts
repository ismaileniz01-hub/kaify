import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import { MAX_JSON_BODY_CHAT, parseJsonWithLimit } from "@/lib/security/body-limit";
import { logWorkoutSession } from "@/lib/services/workout-plan.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(["completed", "missed", "rest", "deload"]),
  timezone: z.string().min(1).max(64).optional(),
  sets: z
    .array(
      z.object({
        exerciseKey: z.string().min(1).max(120),
        reps: z.number().int().min(0).max(50),
        loadKg: z.number().min(0).max(500),
        rir: z.number().int().min(0).max(5).nullable().optional(),
      }),
    )
    .max(24)
    .optional(),
});

/** POST /api/workout/session — complete, miss, rest, or deload today's session. */
export const POST = defineRoute(
  { route: "POST /api/workout/session", rateLimit: "checkin" },
  async ({ user, request }) => {
    const raw = await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid workout session.", parsed.error.issues);
    }
    const key = getOptionalIdempotencyKey(request);
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/workout/session",
      key,
      requestBody: parsed.data,
      handler: async () =>
        logWorkoutSession({
          userId: user.id,
          status: parsed.data.status,
          timezone: parsed.data.timezone,
          sets: parsed.data.sets,
        }),
    });
  },
);
