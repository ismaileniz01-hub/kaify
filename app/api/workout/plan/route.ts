import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { MAX_JSON_BODY_CHAT, parseJsonWithLimit } from "@/lib/security/body-limit";
import {
  applyWorkoutTemplate,
  getWorkoutPlan,
} from "@/lib/services/workout-plan.service";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  templateSlug: z.string().min(1).max(80),
});

/** GET /api/workout/plan — active plan + today's prescription. */
export const GET = defineRoute(
  { route: "GET /api/workout/plan" },
  async ({ user }) => {
    const plan = await getWorkoutPlan(user.id);
    return { plan };
  },
);

/** POST /api/workout/plan — apply a reusable template. */
export const POST = defineRoute(
  { route: "POST /api/workout/plan", rateLimit: "checkin" },
  async ({ user, request }) => {
    const raw = await parseJsonWithLimit(request, MAX_JSON_BODY_CHAT);
    const parsed = applySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Unknown workout template.", parsed.error.issues);
    }
    const plan = await applyWorkoutTemplate(user.id, parsed.data.templateSlug);
    return { plan };
  },
);
