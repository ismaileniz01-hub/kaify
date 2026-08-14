/**
 * Drop poisoned memory that tries to escalate privileges or hijack prompts.
 */

import type { StructuredMemoryItem } from "@/lib/kaios/memory/types";

const POISON_PATTERNS: RegExp[] = [
  /\b(grant|give|enable|unlock)\s+(me\s+)?(premium|pro|admin|root)\b/i,
  /\b(you\s+are\s+now\s+admin|become\s+admin|as\s+an?\s+admin)\b/i,
  /\bignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions?|rules?|prompts?)\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|system)\s+(instructions?|rules?)\b/i,
  /\breveal\s+(your\s+)?(system\s+)?prompt\b/i,
  /\bshow\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\s+enabled\b/i,
];

function itemCorpus(item: StructuredMemoryItem): string {
  const parts = [
    item.text ?? "",
    item.fact ? `${item.fact.key} ${item.fact.value}` : "",
    item.kind,
    item.source,
  ];
  return parts.join("\n");
}

/** True when memory content attempts privilege escalation or prompt leak. */
export function isPoisonMemory(item: StructuredMemoryItem): boolean {
  const corpus = itemCorpus(item);
  return POISON_PATTERNS.some((re) => re.test(corpus));
}

/** Strip poisoned items; preserve order of survivors. */
export function sanitizeMemories(
  items: StructuredMemoryItem[],
): StructuredMemoryItem[] {
  return items.filter((item) => !isPoisonMemory(item));
}
