import { timingSafeEqual } from "node:crypto";

/**
 * Shared cron authentication. All `app/api/cron/*` routes (and the detailed
 * `/api/health` output) must verify the caller presents the `CRON_SECRET` as a
 * bearer token. Centralized here so trimming and placeholder rejection are
 * applied identically everywhere.
 */

/** Returns true when the configured CRON_SECRET is real (not a placeholder). */
export function isCronSecretConfigured(): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && !secret!.includes("your_");
}

function safeEqualToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Verifies the request's Authorization header against CRON_SECRET. */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.includes("your_")) return false;

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  return safeEqualToken(header.slice(prefix.length), secret);
}
