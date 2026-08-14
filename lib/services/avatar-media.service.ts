import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isOwnedAvatarPath, sanitizeAvatarStorageRef } from "@/lib/services/avatar-storage.service";
import { verifyAvatarViewToken } from "@/lib/security/avatar-access-token";

const BUCKET = "avatars";

export async function loadAvatarBytesForToken(
  token: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const userId = verifyAvatarViewToken(token);
  if (!userId) return null;

  const admin = createAdminSupabaseClient();
  const { data: files, error } = await admin.storage.from(BUCKET).list(userId);
  if (error || !files?.length) return null;

  const file = files.find((f) => isOwnedAvatarPath(`${userId}/${f.name}`, userId));
  if (!file) return null;
  const path = sanitizeAvatarStorageRef(`${userId}/${file.name}`, userId);
  if (!path) return null;

  const { data, error: dlError } = await admin.storage.from(BUCKET).download(path);
  if (dlError || !data) {
    logger.warn("[avatar-media] download failed", { error: dlError?.message });
    return null;
  }

  const contentType = data.type || "image/jpeg";
  const body = await data.arrayBuffer();
  return { body, contentType };
}
