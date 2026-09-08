import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { cacheSet, cacheTake, isCacheConfigured } from "@/lib/cache";

export const NATIVE_HANDOFF_TTL_SECONDS = 90;
const REDIS_PREFIX = "r.";
const SEALED_PREFIX = "s.";
const CACHE_KEY_PREFIX = "native-handoff:";

export type NativeHandoffTokens = {
  accessToken: string;
  refreshToken: string;
};

function isDeployedRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

function ticketSecret(): string {
  const secret = process.env.CSRF_SECRET?.trim() || "";
  if (secret && !secret.includes("your_")) return secret;
  if (isDeployedRuntime()) {
    throw new Error("CSRF_SECRET is required for native handoff tickets");
  }
  return "dev-csrf-insecure";
}

function aesKey(): Buffer {
  return createHash("sha256").update(ticketSecret()).digest();
}

function seal(tokens: NativeHandoffTokens, now = Date.now()): string {
  const payload = JSON.stringify({
    ...tokens,
    exp: now + NATIVE_HANDOFF_TTL_SECONDS * 1000,
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function unseal(blob: string, now = Date.now()): NativeHandoffTokens | null {
  try {
    const buf = Buffer.from(blob, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(json) as {
      accessToken?: unknown;
      refreshToken?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < now
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
  } catch {
    return null;
  }
}

export async function issueNativeHandoffTicket(
  tokens: NativeHandoffTokens,
): Promise<string> {
  if (isCacheConfigured()) {
    const id = `${REDIS_PREFIX}${randomBytes(24).toString("base64url")}`;
    await cacheSet(`${CACHE_KEY_PREFIX}${id}`, tokens, NATIVE_HANDOFF_TTL_SECONDS);
    return id;
  }
  return `${SEALED_PREFIX}${seal(tokens)}`;
}

export async function consumeNativeHandoffTicket(
  ticket: string,
): Promise<NativeHandoffTokens | null> {
  const trimmed = ticket.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(REDIS_PREFIX)) {
    return cacheTake<NativeHandoffTokens>(`${CACHE_KEY_PREFIX}${trimmed}`);
  }
  if (trimmed.startsWith(SEALED_PREFIX)) {
    return unseal(trimmed.slice(SEALED_PREFIX.length));
  }
  return null;
}
