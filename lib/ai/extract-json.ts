/**
 * Bounded JSON extraction for model outputs.
 *
 * Production structured output must not greedily swallow `{[\s\S]*}` across
 * prose, competing objects, or quoted user content.
 */

export type JsonExtractFail = {
  ok: false;
  reason:
    | "empty"
    | "malformed"
    | "multiple_values"
    | "not_json"
    | "trailing_junk";
};
export type JsonExtractResult =
  | { ok: true; value: unknown }
  | JsonExtractFail;

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/i;

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "").trim();
}

/**
 * Find the end index (inclusive) of the first top-level JSON object/array.
 * Returns -1 if the value is incomplete or not an object/array.
 */
function firstValueEnd(s: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  let started = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      depth += 1;
      started = true;
      continue;
    }
    if (ch === "}" || ch === "]") {
      depth -= 1;
      if (started && depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Parse exactly one JSON value from `text`.
 * Prefers a single fenced ```json block. Otherwise the entire trimmed string
 * must be one JSON value (object or array). Rejects greedy brace-slicing of
 * surrounding prose and two competing top-level values.
 */
export function extractSingleJsonValue(text: string): JsonExtractResult {
  const raw = stripBom(text);
  if (!raw) return { ok: false, reason: "empty" };

  const fenced = raw.match(FENCE_RE);
  const candidate = (fenced ? fenced[1]! : raw).trim();

  if (!fenced && !/^[\[{]/.test(candidate)) {
    return { ok: false, reason: "not_json" };
  }

  const end = firstValueEnd(candidate);
  if (end < 0) return { ok: false, reason: "malformed" };

  const first = candidate.slice(0, end + 1);
  const rest = candidate.slice(end + 1).trim();
  if (rest.length > 0) {
    if (rest.startsWith("{") || rest.startsWith("[") || rest.startsWith("`")) {
      return { ok: false, reason: "multiple_values" };
    }
    return { ok: false, reason: "trailing_junk" };
  }

  try {
    return { ok: true, value: JSON.parse(first) as unknown };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export function extractJsonObject(
  text: string,
): { ok: true; value: Record<string, unknown> } | JsonExtractFail {
  const extracted = extractSingleJsonValue(text);
  if (!extracted.ok) return extracted;
  if (
    extracted.value === null ||
    typeof extracted.value !== "object" ||
    Array.isArray(extracted.value)
  ) {
    return { ok: false, reason: "not_json" };
  }
  return { ok: true, value: extracted.value as Record<string, unknown> };
}

export function extractJsonArray(
  text: string,
): { ok: true; value: unknown[] } | JsonExtractFail {
  const extracted = extractSingleJsonValue(text);
  if (!extracted.ok) return extracted;
  if (!Array.isArray(extracted.value)) {
    return { ok: false, reason: "not_json" };
  }
  return { ok: true, value: extracted.value };
}
