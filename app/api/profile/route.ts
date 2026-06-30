import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import { getOwnProfile, updateOwnProfile } from "@/lib/services/profile.service";
import { profileUpdateSchema } from "@/lib/validations/profile.schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 * Returns the authenticated user's own profile.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getOwnProfile(user.id);
    return ok(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/profile
 * Updates non-sensitive profile fields. Protected columns (tier,
 * onboarding_status, referral_code, ...) are rejected by the schema and
 * enforced by the database trigger.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz JSON gövdesi.");
    }

    const parsed = profileUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz profil verisi.",
        parsed.error.issues,
      );
    }

    const profile = await updateOwnProfile(user.id, parsed.data);
    return ok(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
