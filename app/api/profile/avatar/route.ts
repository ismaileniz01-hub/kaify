import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { validateAndProcessImage } from "@/lib/security/image";
import {
  MAX_JSON_BODY_ANALYZE,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { updateOwnProfile } from "@/lib/services/profile.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/** POST /api/profile/avatar — upload to Supabase Storage and update profile */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    await enforceUserRateLimit(user.id, "avatar");
    const raw = await parseJsonWithLimit(request, MAX_JSON_BODY_ANALYZE);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz görsel.", parsed.error.issues);
    }

    const inputBuffer = Buffer.from(parsed.data.imageBase64, "base64");
    const validated = await validateAndProcessImage(
      inputBuffer,
      parsed.data.mimeType,
    );

    const path = `${user.id}/avatar.${validated.ext}`;
    const admin = createAdminSupabaseClient();

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, validated.buffer, {
        contentType: validated.mimeType,
        upsert: true,
      });

    if (uploadError) {
      logger.error("[avatar] upload failed", { error: uploadError.message });
      throw new ApiError("INTERNAL_ERROR", "Avatar yüklenemedi.");
    }

    const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(path);
    const profile = await updateOwnProfile(user.id, {
      avatarUrl: publicUrl.publicUrl,
    });

    return ok({ avatarUrl: profile.avatarUrl });
  } catch (error) {
    return handleApiError(error, { route: "/api/profile/avatar" });
  }
}
