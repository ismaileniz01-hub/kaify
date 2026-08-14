import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
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
  avatarObjectPath,
} from "@/lib/services/avatar-storage.service";
import { cacheDelete } from "@/lib/cache";
import { CacheKeys } from "@/lib/cache/keys";

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

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/profile/avatar",
      key: getOptionalIdempotencyKey(request),
      requestBody: { mimeType: parsed.data.mimeType, len: parsed.data.imageBase64.length },
      handler: async () => {
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

          await cacheDelete(CacheKeys.avatarSigned(path));
          await cacheDelete(CacheKeys.avatarSigned(avatarObjectPath(user.id, "jpg")));
          await cacheDelete(CacheKeys.avatarSigned(avatarObjectPath(user.id, "jpeg")));
          await cacheDelete(CacheKeys.avatarSigned(avatarObjectPath(user.id, "png")));
          await cacheDelete(CacheKeys.avatarSigned(avatarObjectPath(user.id, "webp")));

          const admin = createAdminSupabaseClient();
          const { error: profileError } = await admin
            .from("profiles")
            .update({ avatar_url: path })
            .eq("id", user.id);
          if (profileError) {
            throw profileError;
          }

          const signedUrl = await createSignedAvatarUrl(path, user.id);

          return { avatarUrl: signedUrl };
        } catch (error) {
          logger.error("[avatar] upload failed", {
            error: error instanceof Error ? error.message : "unknown",
          });
          throw new ApiError("INTERNAL_ERROR", "Avatar yüklenemedi.");
        }
      },
    });
  },
);
