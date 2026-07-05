import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const BUCKET = "avatars";
const SIGNED_URL_TTL_SEC = 3600;

/** Storage object path inside the avatars bucket (no leading slash). */
export function avatarObjectPath(userId: string, ext: string): string {
  return `${userId}/avatar.${ext}`;
}

/** Normalizes legacy public URLs to object paths. */
export function normalizeAvatarStorageRef(stored: string | null): string | null {
  if (!stored) return null;
  if (stored.startsWith("http")) {
    const marker = "/avatars/";
    const idx = stored.indexOf(marker);
    if (idx >= 0) return stored.slice(idx + marker.length);
    return null;
  }
  return stored.replace(/^\/+/, "");
}

/**
 * Returns short-lived signed URLs for multiple avatar storage refs in one round-trip.
 * Deduplicates paths; static assets (leading `/`) are skipped.
 */
export async function createSignedAvatarUrlsBatch(
  storedRefs: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uniquePaths = new Map<string, string>();

  for (const ref of storedRefs) {
    if (!ref || ref.startsWith("/")) continue;
    const path = normalizeAvatarStorageRef(ref);
    if (path) uniquePaths.set(path, ref);
  }

  if (uniquePaths.size === 0) return result;

  const paths = [...uniquePaths.keys()];
  const admin = createAdminSupabaseClient();
  const bucket = admin.storage.from(BUCKET);

  const batchApi = bucket as typeof bucket & {
    createSignedUrls?: (
      p: string[],
      expiresIn: number,
    ) => Promise<{ data: { path: string; signedUrl: string }[] | null; error: Error | null }>;
  };

  if (typeof batchApi.createSignedUrls === "function") {
    const { data, error } = await batchApi.createSignedUrls(paths, SIGNED_URL_TTL_SEC);
    if (!error && data) {
      for (const item of data) {
        if (!item.path || !item.signedUrl) continue;
        const originalRef = uniquePaths.get(item.path);
        if (originalRef) result.set(originalRef, item.signedUrl);
      }
      return result;
    }
    if (error) {
      logger.warn("[avatar-storage] batch signed urls failed, falling back", {
        error: error.message,
      });
    }
  }

  const signed = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await bucket.createSignedUrl(path, SIGNED_URL_TTL_SEC);
      if (error) {
        logger.warn("[avatar-storage] signed url failed", { path, error: error.message });
        return null;
      }
      return { path, signedUrl: data.signedUrl };
    }),
  );

  for (const item of signed) {
    if (!item?.signedUrl) continue;
    const originalRef = uniquePaths.get(item.path);
    if (originalRef) result.set(originalRef, item.signedUrl);
  }

  return result;
}

/**
 * Returns a short-lived signed URL for a private avatar object.
 * Falls back to null when the object does not exist.
 */
export async function createSignedAvatarUrl(
  stored: string | null,
): Promise<string | null> {
  const path = normalizeAvatarStorageRef(stored);
  if (!path) return null;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error) {
    logger.warn("[avatar-storage] signed url failed", { path, error: error.message });
    return null;
  }

  return data.signedUrl;
}

export async function uploadAvatarObject(params: {
  userId: string;
  ext: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const path = avatarObjectPath(params.userId, params.ext);
  const admin = createAdminSupabaseClient();

  const { error } = await admin.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: params.mimeType,
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return path;
}
