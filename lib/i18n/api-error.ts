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
  "QUOTA_EXCEEDED",
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

export type AnalyzeQuotaDenied = {
  quotaExceeded: true;
  resource: QuotaResource;
};

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }
  return String((error as { code?: unknown }).code);
}

function detailsRecord(error: unknown): Record<string, unknown> | null {
  if (typeof error !== "object" || error === null) return null;
  if (!("details" in error)) return null;
  const details = (error as { details?: unknown }).details;
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return null;
  }
  return details as Record<string, unknown>;
}

function asQuotaResource(value: unknown): QuotaResource | null {
  if (
    value === "maya_photo" ||
    value === "leo_photo" ||
    value === "text_tokens"
  ) {
    return value;
  }
  return null;
}

/** Photo-analyze success envelope when the daily/weekly photo quota is used up. */
export function isAnalyzeQuotaDenied(value: unknown): value is AnalyzeQuotaDenied {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { quotaExceeded?: unknown; resource?: unknown };
  return record.quotaExceeded === true && asQuotaResource(record.resource) !== null;
}

/** Quota exhaustion is QUOTA_EXCEEDED (or legacy FORBIDDEN + resource), not a generic permission error. */
export function quotaResourceFromError(error: unknown): QuotaResource | null {
  const code = errorCode(error);
  if (code !== "FORBIDDEN" && code !== "QUOTA_EXCEEDED") return null;
  const details = detailsRecord(error);
  const fromDetails = asQuotaResource(details?.resource);
  if (fromDetails) return fromDetails;
  if (code === "QUOTA_EXCEEDED") return "text_tokens";
  return null;
}

/** Photo analyze quota without a resource still maps to that coach's photo limit. */
export function visionQuotaResourceFromError(
  coachId: string,
  error: unknown,
): QuotaResource | null {
  const fromError = quotaResourceFromError(error);
  if (fromError === "maya_photo" || fromError === "leo_photo") return fromError;
  if (errorCode(error) !== "QUOTA_EXCEEDED") return fromError;
  if (coachId === "maya") return "maya_photo";
  if (coachId === "leo") return "leo_photo";
  return fromError;
}

export function isQuotaExhaustedError(error: unknown): boolean {
  return quotaResourceFromError(error) !== null;
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

export function quotaErrorMessage(resource: QuotaResource, t: Translator): string {
  return t(quotaMessageKey(resource));
}

/** Translates an API error code into a localized, user-facing message. */
export function apiErrorMessage(
  code: string | null | undefined,
  t: Translator,
): string {
  if (code === "QUOTA_EXCEEDED") return t("errors.QUOTA_TEXT");
  const normalized =
    code && (KNOWN_CODES as readonly string[]).includes(code)
      ? code
      : "INTERNAL_ERROR";
  return t(`errors.${normalized}`);
}

/** Extracts a `code` from a thrown error (e.g. ApiClientError) and localizes it. */
export function errorToMessage(error: unknown, t: Translator): string {
  const quota = quotaResourceFromError(error);
  if (quota) return quotaErrorMessage(quota, t);
  const code = errorCode(error) || undefined;
  return apiErrorMessage(code, t);
}

function thrownErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message.trim() : "";
}

/**
 * Photo analyze failures must not become the spoken "say it again" retry line.
 * Blurry photos keep the server copy; provider faults use chat.error.photo.
 */
export function photoAnalysisFailureText(
  error: unknown,
  t: Translator,
): string {
  const code = errorCode(error);
  if (code === "VALIDATION_ERROR") {
    const message = thrownErrorMessage(error);
    if (message) return message;
  }
  if (
    code === "UNSUPPORTED_IMAGE" ||
    code === "UPLOAD_TOO_LARGE" ||
    code === "NETWORK"
  ) {
    return errorToMessage(error, t);
  }
  return t("chat.error.photo");
}
