import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { defineRoute, defineRouteRaw } from "@/lib/api/route-handler";
import { deleteUserAccount } from "@/lib/services/account.service";
import { getOwnProfile, updateOwnProfile } from "@/lib/services/profile.service";
import { profileUpdateSchema } from "@/lib/validations/profile.schema";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({ confirm: z.literal("DELETE") });

/**
 * GET /api/profile
 * Returns the authenticated user's own profile.
 */
export const GET = defineRoute(
  { route: "GET /api/profile" },
  async ({ user }) => getOwnProfile(user.id),
);

/**
 * PATCH /api/profile
 * Updates non-sensitive profile fields. Protected columns (tier,
 * onboarding_status, referral_code, ...) are rejected by the schema and
 * enforced by the database trigger.
 */
export const PATCH = defineRoute(
  { route: "PATCH /api/profile" },
  async ({ user, request }) => {
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

    return updateOwnProfile(user.id, parsed.data);
  },
);

/**
 * DELETE /api/profile
 * Permanently deletes the caller's account and all associated data
 * (KVKK/GDPR right to be forgotten). Requires an explicit
 * `{ "confirm": "DELETE" }` body to prevent accidental deletion.
 */
export const DELETE = defineRouteRaw(
  {
    route: "DELETE /api/profile",
    sensitiveAction: true,
    rateLimit: "profile_delete",
    requireCsrf: true,
  },
  async ({ user, request }) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Silme işlemi için onay gerekir.");
    }

    const parsed = deleteSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        'Hesabı silmek için gövdede { "confirm": "DELETE" } gönderilmelidir.',
      );
    }

    await deleteUserAccount(user.id);
    return ok({ deleted: true });
  },
);
