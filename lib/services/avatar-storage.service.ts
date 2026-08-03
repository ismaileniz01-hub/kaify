import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { logger } from "@/lib/logger";

const BUCKET = "avatars";
const SIGNED_URL_TTL_SEC = 3600;

/** `{userId}/avatar.{ext}` — only paths written by the upload API. */
const OWNED_AVATAR_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(jpe?g|png|webp)$/i;

/** Storage object path inside the avatars bucket (no leading slash). */
export function avatarObjectPath(userId: string, ext: string): string {
  return `${userId}/avatar.${ext}`;
}

/**
 * True when `path` is a well-formed owned avatar object path for `ownerUserId`
 * (or any user when owner is omitted). Rejects traversal and foreign paths.
 */
export function isOwnedAvatarPath(
  path: string,
  ownerUserId?: string,
): boolean {
  if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    return false;
  }
  if (!OWNED_AVATAR_PATH.test(path)) return false;
  if (ownerUserId && !path.toLowerCase().startsWith(`${ownerUserId.toLowerCase()}/`)) {
    return false;
  }
  return true;
}

/** Normalizes legacy public URLs to object paths. */
export function normalizeAvatarStorageRef(stored: string | null): string | null {
  if (!stored) return null;
  if (stored.startsWith("http")) {
    const marker = "/avatars/";
    const idx = stored.indexOf(marker);
    if (idx >= 0) {
      const path = stored.slice(idx + marker.length).split("?")[0] ?? "";
      return path || null;
    }
    return null;
  }
  return stored.replace(/^\/+/, "");
}

/**
 * Returns a storage path only when it is a valid owned avatar object.
 * Foreign / malformed refs are dropped (defense against IDOR on signed URLs).
 */
export function sanitizeAvatarStorageRef(
  stored: string | null,
  ownerUserId?: string,
): string | null {
  const path = normalizeAvatarStorageRef(stored);
  if (!path) return null;
  if (!isOwnedAvatarPath(path, ownerUserId)) return null;
  return path;
}

/**
 * Returns short-lived signed URLs for multiple avatar storage refs in one round-trip.
 * Deduplicates paths; static assets (leading `/`) are skipped.
 * When `ownerByRef` is provided, each ref must belong to that owner.
 */
export async function createSignedAvatarUrlsBatch(
  storedRefs: (string | null | undefined)[],
  ownerByRef?: Map<string, string>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uniquePaths = new Map<string, string>();

  for (const ref of storedRefs) {
    if (!ref || ref.startsWith("/")) continue;
    const ownerUserId = ownerByRef?.get(ref);
    const path = sanitizeAvatarStorageRef(ref, ownerUserId);
    if (path) uniquePaths.set(path, ref);
  }

  if (uniquePaths.size === 0) return result;

  const paths = [...uniquePaths.keys()];
  const uncachedPaths: string[] = [];

  for (const path of paths) {
    const cachedUrl = await cacheGet<string>(CacheKeys.avatarSigned(path));
    if (cachedUrl) {
      const originalRef = uniquePaths.get(path);
      if (originalRef) result.set(originalRef, cachedUrl);
    } else {
      uncachedPaths.push(path);
    }
  }

  if (uncachedPaths.length === 0) return result;

  const admin = createAdminSupabaseClient();
  const bucket = admin.storage.from(BUCKET);

  const batchApi = bucket as typeof bucket & {
    createSignedUrls?: (
      p: string[],
      expiresIn: number,
    ) => Promise<{ data: { path: string; signedUrl: string }[] | null; error: Error | null }>;
  };

  const storeSigned = async (path: string, signedUrl: string) => {
    const originalRef = uniquePaths.get(path);
    if (originalRef) result.set(originalRef, signedUrl);
    await cacheSet(CacheKeys.avatarSigned(path), signedUrl, CacheTTL.avatarSigned);
  };

  if (typeof batchApi.createSignedUrls === "function") {
    const { data, error } = await batchApi.createSignedUrls(uncachedPaths, SIGNED_URL_TTL_SEC);
    if (!error && data) {
      for (const item of data) {
        if (!item.path || !item.signedUrl) continue;
        await storeSigned(item.path, item.signedUrl);
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
    uncachedPaths.map(async (path) => {
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
    await storeSigned(item.path, item.signedUrl);
  }

  return result;
}

/**
 * Returns a short-lived signed URL for a private avatar object.
 * Falls back to null when the object does not exist or is not owned.
 */
export async function createSignedAvatarUrl(
  stored: string | null,
  ownerUserId?: string,
): Promise<string | null> {
  const path = sanitizeAvatarStorageRef(stored, ownerUserId);
  if (!path) return null;

  const cachedUrl = await cacheGet<string>(CacheKeys.avatarSigned(path));
  if (cachedUrl) return cachedUrl;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error) {
    logger.warn("[avatar-storage] signed url failed", { path, error: error.message });
    return null;
  }

  await cacheSet(CacheKeys.avatarSigned(path), data.signedUrl, CacheTTL.avatarSigned);
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
