import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { syncHealthSteps } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  entries: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        steps: z.number().int().min(0).max(100_000),
        source: z.enum(["healthkit", "google_fit", "manual"]).default("manual"),
      }),
    )
    .min(1)
    .max(31),
});

/** POST /api/health/steps — HealthKit / Google Fit step sync. */
export const POST = defineRoute(
  { route: "POST /api/health/steps", rateLimit: "steps" },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz adım verisi.", parsed.error.issues);
    }
    await syncHealthSteps(user.id, parsed.data.entries);
    return { synced: parsed.data.entries.length };
  },
);
