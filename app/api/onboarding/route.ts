import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { completeOnboarding } from "@/lib/services/onboarding.service";
import { onboardingSchema } from "@/lib/validations/onboarding.schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding
 * Validates the onboarding form and transitions the user to FORMS_COMPLETED.
 */
export const POST = defineRoute(
  { route: "POST /api/onboarding" },
  async ({ request }) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz JSON gövdesi.");
    }

    const parsed = onboardingSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz onboarding verisi.",
        parsed.error.issues,
      );
    }

    return completeOnboarding(parsed.data);
  },
);
