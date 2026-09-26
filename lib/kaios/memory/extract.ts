/**
 * Heuristic extraction of structured facts from condensation / summary text.
 * Keep simple — bullet lines and "key: value" / "key - value" patterns.
 */

import type { StructuredMemoryFact } from "@/lib/kaios/memory/types";

const BULLET_RE = /^\s*[-*•]\s+(.+)$/;
const KV_RE =
  /^(.{1,80}?)\s*(?::|[-–—]|→|=)\s+(.{1,200})$/;

/**
 * Parse short key/value facts from condensation text.
 * Returns [] when nothing structured is found.
 */
export function parseStructuredFacts(text: string): StructuredMemoryFact[] {
  if (!text || typeof text !== "string") return [];

  const facts: StructuredMemoryFact[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    const bullet = line.match(BULLET_RE);
    if (bullet) line = bullet[1].trim();

    const kv = line.match(KV_RE);
    if (!kv) continue;

    const key = kv[1].trim().replace(/^[*_`]+|[*_`]+$/g, "");
    const value = kv[2].trim().replace(/^[*_`]+|[*_`]+$/g, "");
    if (!key || !value) continue;
    // Skip sentence-like "keys" that are clearly not labels
    if (key.split(/\s+/).length > 6) continue;

    const dedupe = `${key.toLowerCase()}::${value.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    facts.push({ key, value });
  }

  return facts;
}
