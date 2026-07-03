import { ApiError } from "@/lib/api/errors";

const IDEMPOTENCY_HEADER = "idempotency-key";

/**
 * Allowed characters for an Idempotency-Key. Accepts UUIDs and common
 * client-generated tokens (8–128 chars of url-safe characters).
 */
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Reads and validates the Idempotency-Key header when present.
 * Returns null when the header is absent. Throws 400 when present but malformed.
 */
export function getOptionalIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get(IDEMPOTENCY_HEADER);
  if (raw === null) {
    return null;
  }

  const key = raw.trim();
  if (!KEY_PATTERN.test(key)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Geçersiz Idempotency-Key başlığı. 8-128 url-güvenli karakter olmalı.",
    );
  }

  return key;
}

/**
 * Like getOptionalIdempotencyKey but requires the header to be present.
 * Use for mutations where client-supplied idempotency is mandatory
 * (e.g. gem spend / purchases).
 */
export function requireIdempotencyKey(request: Request): string {
  const key = getOptionalIdempotencyKey(request);
  if (!key) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Idempotency-Key başlığı zorunludur.",
    );
  }
  return key;
}
