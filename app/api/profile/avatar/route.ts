import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { logger } from "@/lib/logger";
import { validateAndProcessImage } from "@/lib/security/image";
import {
  MAX_JSON_BODY_AVATAR,
  parseJsonWithLimit,
} from "@/lib/security/body-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  uploadAvatarObject,
  createSignedAvatarUrl,
} from "@/lib/services/avatar-storage.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  imageBase64: z.string().min(100).max(14_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/** POST /api/profile/avatar — upload to private Supabase Storage (signed URL access). */
export const POST = defineRoute(
  { route: "POST /api/profile/avatar", rateLimit: "avatar", requireCsrf: true },
  async ({ user, request }) => {
    const raw = await parseJsonWithLimit(request, MAX_JSON_BODY_AVATAR);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz görsel.", parsed.error.issues);
    }

    const inputBuffer = Buffer.from(parsed.data.imageBase64, "base64");
    const validated = await validateAndProcessImage(
      inputBuffer,
      parsed.data.mimeType,
    );

    try {
      const path = await uploadAvatarObject({
        userId: user.id,
        ext: validated.ext,
        buffer: validated.buffer,
        mimeType: validated.mimeType,
      });

      const admin = createAdminSupabaseClient();
      const { error: profileError } = await admin
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (profileError) {
        throw profileError;
      }

      const signedUrl = await createSignedAvatarUrl(path);

      return { avatarUrl: signedUrl };
    } catch (error) {
      logger.error("[avatar] upload failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      throw new ApiError("INTERNAL_ERROR", "Avatar yüklenemedi.");
    }
  },
);
