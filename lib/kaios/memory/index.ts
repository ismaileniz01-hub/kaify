/**
 * KAIOS memory helpers — sanitize + select for chat context injection.
 *
 * Wire note: chat path can keep using getRecentMemories from memory.service,
 * then map strings → StructuredMemoryItem and pass through sanitize + select.
 */

export type {
  SelectMemoriesOptions,
  StructuredMemoryFact,
  StructuredMemoryItem,
} from "@/lib/kaios/memory/types";

export { sanitizeMemories, isPoisonMemory } from "@/lib/kaios/memory/sanitize";
export { selectRelevantMemories } from "@/lib/kaios/memory/select";
export { parseStructuredFacts } from "@/lib/kaios/memory/extract";

import type { StructuredMemoryItem } from "@/lib/kaios/memory/types";
import { selectRelevantMemories } from "@/lib/kaios/memory/select";

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

/**
 * Convenience: summaries → sanitize + selectRelevantMemories.
 * Use after getRecentMemories(...) in chat context building.
 */
export function prepareMemoriesForContext(
  summaries: string[],
  options: {
    coach?: string;
    intent?: string;
    userMessage?: string;
    limit?: number;
    source?: string;
    createdAt?: string[];
  } = {},
): StructuredMemoryItem[] {
  const items = memoriesFromSummaries(summaries, options.source).map((item, i) => ({
    ...item,
    createdAt: options.createdAt?.[i],
  }));
  return selectRelevantMemories(items, {
    coach: options.coach,
    intent: options.intent,
    userMessage: options.userMessage,
    limit: options.limit,
  });
}
