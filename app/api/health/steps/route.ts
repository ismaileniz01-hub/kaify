import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { syncHealthSteps } from "@/lib/services/analytics.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  entries: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        steps: z.number().int().min(0),
        source: z.enum(["healthkit", "google_fit", "manual"]).default("manual"),
      }),
    )
    .min(1)
    .max(31),
});

/** POST /api/health/steps — HealthKit / Google Fit step sync. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    await enforceUserRateLimit(user.id, "steps");
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz adım verisi.", parsed.error.issues);
    }
    await syncHealthSteps(user.id, parsed.data.entries);
    return ok({ synced: parsed.data.entries.length });
  } catch (error) {
    return handleApiError(error, { route: "/api/health/steps" });
  }
}
