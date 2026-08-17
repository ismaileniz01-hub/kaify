/**
 * Client-side translation for API errors.
 *
 * API routes return a stable machine-readable `code` (plus a human message that
 * may be in any language). The UI must show the message in the user's selected
 * language, so we translate by code via the `errors.<CODE>` i18n keys instead of
 * displaying the raw server message.
 */

export type Translator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

const KNOWN_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "STEP_UP_REQUIRED",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
  "NETWORK",
  "SESSION_EXPIRED",
  "UPLOAD_TOO_LARGE",
  "UNSUPPORTED_IMAGE",
  "ANALYSIS_UNAVAILABLE",
  "SAVE_FAILED",
  "PROVIDER_UNAVAILABLE",
  "STREAM_ERROR",
] as const;

export type QuotaResource = "maya_photo" | "leo_photo" | "text_tokens";

function detailsRecord(error: unknown): Record<string, unknown> | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("details" in error)) return null;
  const details = (error as { details?: unknown }).details;
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return null;
  }
  return details as Record<string, unknown>;
}

/** Quota exhaustion is FORBIDDEN + LIMIT_100, not a generic permission error. */
export function quotaResourceFromError(error: unknown): QuotaResource | null {
  if (typeof error !== "object" || error === null) return null;
  const code =
    "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code !== "FORBIDDEN") return null;
  const details = detailsRecord(error);
  if (!details) return null;
  if (details.warning_trigger !== "LIMIT_100") return null;
  const resource = details.resource;
  if (
    resource === "maya_photo" ||
    resource === "leo_photo" ||
    resource === "text_tokens"
  ) {
    return resource;
  }
  return null;
}

function quotaMessageKey(resource: QuotaResource): string {
  switch (resource) {
    case "maya_photo":
      return "errors.QUOTA_MAYA_PHOTO";
    case "leo_photo":
      return "errors.QUOTA_LEO_PHOTO";
    default:
      return "errors.QUOTA_TEXT";
  }
}

/** Translates an API error code into a localized, user-facing message. */
export function apiErrorMessage(
  code: string | null | undefined,
  t: Translator,
): string {
  const normalized =
    code && (KNOWN_CODES as readonly string[]).includes(code)
      ? code
      : "INTERNAL_ERROR";
  return t(`errors.${normalized}`);
}

/** Extracts a `code` from a thrown error (e.g. ApiClientError) and localizes it. */
export function errorToMessage(error: unknown, t: Translator): string {
  const quota = quotaResourceFromError(error);
  if (quota) return t(quotaMessageKey(quota));
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  return apiErrorMessage(code, t);
}
