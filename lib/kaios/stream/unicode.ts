/**
 * Unicode-safe stream completion checks.
 * Prevents persisting corrupted / unexpectedly truncated UTF-16 text as success.
 */

/** True when the string contains unpaired UTF-16 surrogates. */
export function hasBrokenUtf16(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

/**
 * Mark incomplete stream: aborted signal, broken UTF-16, or empty after start.
 * Does not try to guess mid-word truncation for every language.
 */
export function isStreamCompletionSuspicious(input: {
  text: string;
  aborted?: boolean;
  sawDelta?: boolean;
  /** Provider finish_reason — "length" means output was cut at max_tokens. */
  finishReason?: string | null;
}): boolean {
  if (input.aborted) return true;
  if (hasBrokenUtf16(input.text)) return true;
  if (input.sawDelta && input.text.trim().length === 0) return true;
  // Hit max_tokens: keep a long usable reply (weekly plans often complete the
  // spoken message then get cut in JSON). Only retry short truncated scraps.
  if (input.finishReason === "length" && input.text.trim().length < 120) {
    return true;
  }
  return false;
}
