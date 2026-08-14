import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function tokenSecret(): string {
  const secret = process.env.CSRF_SECRET?.trim() || "";
  if (secret && !secret.includes("your_")) return `avatar-view:${secret}`;
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    throw new Error("CSRF_SECRET is required to mint avatar view tokens");
  }
  return "dev-avatar-view-insecure";
}

function aesKey(): Buffer {
  return createHash("sha256").update(tokenSecret()).digest();
}

/** Opaque AES-GCM token. The user UUID is not recoverable without the server secret. */
export function mintAvatarViewToken(userId: string, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const plaintext = Buffer.from(`${userId}.${now + TOKEN_TTL_MS}`, "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function verifyAvatarViewToken(
  token: string,
  now = Date.now(),
): string | null {
  if (!token || token.length > 512) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(token, "base64url");
  } catch {
    return null;
  }
  if (buf.length < 12 + 16 + 8) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  try {
    const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
    decipher.setAuthTag(tag);
    const payload = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const dot = payload.lastIndexOf(".");
    if (dot <= 0) return null;
    const userId = payload.slice(0, dot);
    const exp = Number(payload.slice(dot + 1));
    if (!userId || !Number.isFinite(exp) || now > exp) return null;
    return userId;
  } catch {
    return null;
  }
}

export function publicAvatarSrc(userId: string): string {
  return `/api/media/avatar?t=${encodeURIComponent(mintAvatarViewToken(userId))}`;
}
