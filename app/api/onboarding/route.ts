import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import { completeOnboarding } from "@/lib/services/onboarding.service";
import { onboardingSchema } from "@/lib/validations/onboarding.schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding
 * Validates the onboarding form and transitions the user to FORMS_COMPLETED.
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser();

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

    const profile = await completeOnboarding(parsed.data);
    return ok(profile);
  } catch (error) {
    return handleApiError(error, { route: "/api/onboarding" });
  }
}
