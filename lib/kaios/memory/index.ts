/**
 * KAIOS memory helpers — sanitize + select for chat context injection.
 */

export type {
  SelectMemoriesOptions,
  StructuredMemoryFact,
  StructuredMemoryItem,
} from "@/lib/kaios/memory/types";

export { sanitizeMemories, isPoisonMemory } from "@/lib/kaios/memory/sanitize";
export { selectRelevantMemories } from "@/lib/kaios/memory/select";
export { parseStructuredFacts } from "@/lib/kaios/memory/extract";
export {
  extractUserMemoryFacts,
  MEMORY_TTL_DAYS,
} from "@/lib/kaios/memory/keys";
export { MEMORY_STALE_MS } from "@/lib/kaios/memory/select";

import type { StructuredMemoryItem } from "@/lib/kaios/memory/types";
import { selectRelevantMemories } from "@/lib/kaios/memory/select";
import { parseStructuredFacts } from "@/lib/kaios/memory/extract";

export type MemoryRecord = {
  summary: string;
  createdAt?: string;
  factKey?: string | null;
  keyFacts?: Record<string, string>;
};

/** Map raw summary strings (e.g. getRecentMemories) into structured items. */
export function memoriesFromSummaries(
  summaries: string[],
  source = "coaching_memory",
): StructuredMemoryItem[] {
  return summaries
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((text, i) => ({
      kind: "summary",
      text: text.trim(),
      source,
      id: `summary-${i}`,
    }));
}

/** Map persisted 90-day rows into keyed facts (newest key wins). */
export function memoriesFromRecords(
  rows: MemoryRecord[],
  source = "coaching_memory",
): StructuredMemoryItem[] {
  const items: StructuredMemoryItem[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    const fromColumn = row.factKey?.trim();
    const fromJson = row.keyFacts ? Object.keys(row.keyFacts)[0] : undefined;
    const key = fromColumn || fromJson;
    const value =
      (key && row.keyFacts?.[key]) ||
      (key && row.summary.includes(":")
        ? row.summary.replace(/^[^:]+:\s*/, "").trim()
        : undefined);

    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      items.push({
        id: `fact-${key}`,
        kind: "fact",
        text: value ? `${key}: ${value}` : row.summary.trim(),
        fact: value ? { key, value } : undefined,
        source,
        createdAt: row.createdAt,
      });
      continue;
    }

    if (!key && row.summary.trim()) {
      const parsed = parseStructuredFacts(row.summary);
      if (parsed.length > 0) {
        for (const fact of parsed) {
          if (seenKeys.has(fact.key)) continue;
          seenKeys.add(fact.key);
          items.push({
            id: `fact-${fact.key}-${i}`,
            kind: "fact",
            text: `${fact.key}: ${fact.value}`,
            fact,
            source,
            createdAt: row.createdAt,
          });
        }
        continue;
      }
      items.push({
        id: `summary-${i}`,
        kind: "summary",
        text: row.summary.trim(),
        source,
        createdAt: row.createdAt,
      });
    }
  }

  return items;
}

/**
 * Records or summaries → sanitize + selectRelevantMemories.
 */
export function prepareMemoriesForContext(
  input: string[] | MemoryRecord[],
  options: {
    coach?: string;
    intent?: string;
    userMessage?: string;
    limit?: number;
    source?: string;
    createdAt?: string[];
  } = {},
): StructuredMemoryItem[] {
  const items = (typeof input[0] === "string"
    ? memoriesFromSummaries(input as string[], options.source)
    : memoriesFromRecords(input as MemoryRecord[], options.source)
  ).map((item, i) => ({
    ...item,
    createdAt: item.createdAt ?? options.createdAt?.[i],
  }));
  return selectRelevantMemories(items, {
    coach: options.coach,
    intent: options.intent,
    userMessage: options.userMessage,
    limit: options.limit,
  });
}
