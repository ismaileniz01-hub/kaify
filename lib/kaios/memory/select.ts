/**
 * Select a small set of RELEVANT memories. Never pads with irrelevant items.
 * Hard cap: 5. No minimum — 0 is correct when nothing qualifies.
 */

import { sanitizeMemories } from "@/lib/kaios/memory/sanitize";
import type {
  SelectMemoriesOptions,
  StructuredMemoryItem,
} from "@/lib/kaios/memory/types";

const HARD_LIMIT = 5;
/** Minimum score after keyword / overlap hits. Baseline filler score is 0. */
export const MEMORY_RELEVANCE_THRESHOLD = 2;
const STALE_MS = 180 * 24 * 60 * 60 * 1000;

const STOPWORDS = new Set(
  [
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "my", "i",
    "you", "we", "is", "it", "that", "this", "with", "me", "im", "i'm",
    "ve", "just", "today", "please", "hey", "hi", "ok", "the",
    "bir", "ve", "ile", "bu", "şu", "icin", "için", "ben", "ya",
  ].map((s) => s.toLowerCase()),
);

const COACH_KEYWORDS: Record<string, string[]> = {
  alex: ["train", "lift", "workout", "exercise", "form", "program", "set", "rep", "lagging", "leo_priority", "back", "calves"],
  maya: ["meal", "food", "macro", "protein", "calorie", "diet", "hydrat", "nutrition"],
  leo: ["physique", "posture", "photo", "muscle", "body", "score", "progress"],
  kai: ["mood", "motivat", "feel", "habit", "check-in", "friend", "streak", "exam"],
  council: ["plan", "decision", "together", "team"],
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  meal_analysis: ["meal", "food", "ate", "calories", "macro"],
  meal_plan: ["meal", "plan", "diet", "protein"],
  nutrition_question: ["nutrition", "macro", "food", "calorie"],
  hydration: ["water", "hydrat"],
  exercise_form: ["form", "squat", "deadlift", "bench", "lift"],
  programming: ["program", "split", "workout", "volume"],
  physique_analysis: ["physique", "photo", "muscle", "score"],
  motivation: ["motivat", "tired", "mood", "streak"],
  casual: [],
};

function itemText(item: StructuredMemoryItem): string {
  return [
    item.text ?? "",
    item.fact ? `${item.fact.key} ${item.fact.value}` : "",
    item.kind,
  ]
    .join(" ")
    .toLowerCase();
}

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9ğüşöçıàáâãäåèéêëìíîïòóôõöùúûüñß]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function overlapScore(memoryText: string, userMessage?: string): number {
  if (!userMessage || userMessage.trim().length === 0) return 0;
  const mem = new Set(significantTokens(memoryText));
  const msg = significantTokens(userMessage);
  let hits = 0;
  for (const t of msg) {
    if (mem.has(t)) hits += 3;
  }
  return hits;
}

function scoreItem(
  item: StructuredMemoryItem,
  options: SelectMemoriesOptions,
): number {
  const text = itemText(item);
  let score = 0;

  if (options.coach) {
    const keys = COACH_KEYWORDS[options.coach.toLowerCase()] ?? [];
    for (const k of keys) {
      if (text.includes(k)) score += 2;
    }
  }

  if (options.intent) {
    const keys = INTENT_KEYWORDS[options.intent.toLowerCase()] ?? [];
    for (const k of keys) {
      if (text.includes(k)) score += 2;
    }
  }

  score += overlapScore(text, options.userMessage);
  if (
    text.includes("kaios event") ||
    text.includes("leo_priority") ||
    text.includes("leo_lagging") ||
    text.includes("meal_saved") ||
    text.includes("workout_completed")
  ) {
    score += 3;
  }
  return score;
}

function isStaleWeak(item: StructuredMemoryItem, score: number, now: number): boolean {
  if (!item.createdAt) return false;
  const t = Date.parse(item.createdAt);
  if (!Number.isFinite(t)) return false;
  return now - t > STALE_MS && score < 4;
}

/**
 * Sanitize, drop poison, then keep only items that clear the relevance threshold.
 * Never pads up to 5 with irrelevant memories.
 */
export function selectRelevantMemories(
  items: StructuredMemoryItem[],
  options: SelectMemoriesOptions = {},
): StructuredMemoryItem[] {
  const requested =
    typeof options.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(0, Math.floor(options.limit))
      : HARD_LIMIT;
  const limit = Math.min(HARD_LIMIT, requested);

  const clean = sanitizeMemories(items);
  if (limit === 0 || clean.length === 0) return [];

  const now = Date.now();
  const intent = options.intent ?? "";
  const ranked = clean
    .map((item, index) => ({
      item,
      index,
      score: scoreItem(item, options),
    }))
    .filter((row) => {
      if (isStaleWeak(row.item, row.score, now)) return false;
      if (intent === "casual") {
        return overlapScore(itemText(row.item), options.userMessage) >= 3;
      }
      return row.score >= MEMORY_RELEVANCE_THRESHOLD;
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked.slice(0, limit).map((r) => r.item);
}
