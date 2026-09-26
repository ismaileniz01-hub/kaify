import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { MAX_JSON_BODY_CHAT, parseJsonWithLimit } from "@/lib/security/body-limit";
import { swapPlanExercise } from "@/lib/services/workout-plan.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  fromKey: z.string().min(1).max(120),
  toKey: z.string().min(1).max(120),
});

/** POST /api/workout/swap — same muscle-group substitute. */
export const POST = defineRoute(
  { route: "POST /api/workout/swap", rateLimit: "checkin" },
  async ({ user, request }) => {
    const raw = await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid exercise swap.", parsed.error.issues);
    }
    const plan = await swapPlanExercise(user.id, parsed.data.fromKey, parsed.data.toKey);
    return { plan };
  },
);
