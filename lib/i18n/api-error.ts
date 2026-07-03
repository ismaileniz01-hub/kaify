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
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

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
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  return apiErrorMessage(code, t);
}
