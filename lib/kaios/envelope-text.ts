/**
 * Keep KAIOS envelope JSON out of the user-visible coach bubble.
 */

import { extractFirstJsonObjectLenient } from "@/lib/ai/extract-json";

const ENVELOPE_MARK = /kaios\.envelope|["']schema_version["']/;

function isEnvelopeObject(value: Record<string, unknown>): boolean {
  const message = value.message;
  if (typeof message !== "string" || !message.trim()) return false;
  if (value.schema_version === "kaios.envelope.v1") return true;
  return typeof value.coach === "string" && typeof value.intent === "string";
}

export function looksLikeLeakedEnvelope(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (!ENVELOPE_MARK.test(t)) return false;
  return (
    t.startsWith("{") ||
    /^```(?:json)?/i.test(t) ||
    /["']coach["']/.test(t)
  );
}

export function looksLikeJsonStreamPrefix(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("```");
}

/** User-facing coach copy: envelope JSON → message field, or empty if unsavable leak. */
export function coachVisibleMessage(text: string): string {
  if (!text) return text;
  if (!looksLikeLeakedEnvelope(text) && !looksLikeJsonStreamPrefix(text)) {
    return text;
  }
  const extracted = extractFirstJsonObjectLenient(text);
  if (extracted.ok && isEnvelopeObject(extracted.value)) {
    return String(extracted.value.message).trim();
  }
  if (looksLikeLeakedEnvelope(text)) return "";
  return text;
}
