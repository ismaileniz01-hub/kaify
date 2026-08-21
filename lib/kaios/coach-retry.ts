/**
 * When a coach turn fails or leaks internals, the user sees a short
 * "didn't catch that" line — never error codes, schema names, or stack labels.
 */

import { aiCopy } from "@/lib/ai/ai-copy";
import { quotaResourceFromError } from "@/lib/i18n/api-error";
import {
  coachVisibleMessage,
  looksLikeLeakedEnvelope,
} from "@/lib/kaios/envelope-text";

const ERROR_CODE_RE =
  /\b(INTERNAL_ERROR|STREAM_ERROR|VALIDATION_ERROR|UNAUTHORIZED|FORBIDDEN|QUOTA_EXCEEDED|NOT_FOUND|CONFLICT|RATE_LIMITED|SERVICE_UNAVAILABLE|STEP_UP_REQUIRED|UPLOAD_TOO_LARGE|UNSUPPORTED_IMAGE|ANALYSIS_UNAVAILABLE|SAVE_FAILED|PROVIDER_UNAVAILABLE|AI_TIMEOUT|AI_UPSTREAM|AI_BAD_OUTPUT|AI_CONFIG|AI_LOW_QUALITY|AI_ENV_INVALID|TOOL_EXECUTION_FAILED)\b/;

const INTERNAL_LEAK_RE =
  /\b(schema_version|kaios\.envelope|action_truth|TOOL_RESULTS|BEGIN_USER_MESSAGE|END_USER_MESSAGE|KFY-[0-9a-f]{8,}|ZodError|TypeError)\b/i;

const HARD_FAIL_CODES = new Set([
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "STEP_UP_REQUIRED",
  "NOT_FOUND",
  "CONFLICT",
]);

export function coachRetryLine(locale?: string | null): string {
  return aiCopy(locale, "coach_retry");
}

export function isCoachRetryLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    trimmed === aiCopy("en", "coach_retry") ||
    trimmed === aiCopy("tr", "coach_retry") ||
    trimmed === aiCopy("de", "coach_retry") ||
    trimmed === aiCopy("es", "coach_retry") ||
    trimmed === aiCopy("fr", "coach_retry") ||
    trimmed === aiCopy("ar", "coach_retry")
  );
}

export function looksLikeUnsafeCoachText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (ERROR_CODE_RE.test(trimmed)) return true;
  if (INTERNAL_LEAK_RE.test(trimmed)) return true;
  if (looksLikeLeakedEnvelope(trimmed)) return true;
  if (/^\s*[{[]/.test(trimmed) && /("code"|"error"|schema_version)/.test(trimmed)) {
    return true;
  }
  return false;
}

/** Spoken coach copy, or a retry line if the model leaked internals / failed. */
export function sanitizeCoachVisibleText(
  text: string,
  locale?: string | null,
  coachId?: string | null,
): string {
  const spoken = coachVisibleMessage(text).trim();
  if (looksLikeUnsafeCoachText(spoken)) return coachRetryLine(locale);
  return scrubCoachLaneVoice(spoken, coachId);
}

const LEO_NICKNAME_RE =
  /\b(reis|kral|bro|kanka|canım|canim|dostum|yakışıklı|yakisikli|terminator|güzelim|guzelim|queen|champ|buddy|pal|handsome)\b/gi;

/**
 * Capsules are prompt-only; this stops Maya/Leo/Kai from leaking Alex gym-bark
 * nicknames (reis/kral/bro) into the persisted reply. Leo also drops pet names.
 */
export function scrubCoachLaneVoice(
  text: string,
  coachId?: string | null,
): string {
  const coach = (coachId ?? "").toLowerCase();
  if (!coach || coach === "alex") return text;

  const pattern =
    coach === "kai"
      ? /\b(reis|kral)\b/gi
      : coach === "maya"
        ? /\b(reis|kral|bro)\b/gi
        : coach === "leo"
          ? LEO_NICKNAME_RE
          : null;
  if (!pattern) return text;

  const next = text
    .replace(pattern, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return next.length > 0 ? next : text;
}

/** Quota / auth / validation stay real errors. Everything else becomes a retry line. */
export function isSoftCoachFailure(code: string, details?: unknown): boolean {
  if (quotaResourceFromError({ code, details })) return false;
  if (HARD_FAIL_CODES.has(code)) return false;
  return true;
}
