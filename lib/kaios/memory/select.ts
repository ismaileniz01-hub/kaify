/**
 * Select a small set of memories relevant to coach + intent.
 * Hard cap: never returns more than 5 items.
 */

import { sanitizeMemories } from "@/lib/kaios/memory/sanitize";
import type {
  SelectMemoriesOptions,
  StructuredMemoryItem,
} from "@/lib/kaios/memory/types";

const HARD_LIMIT = 5;

const COACH_KEYWORDS: Record<string, string[]> = {
  alex: ["train", "lift", "workout", "exercise", "form", "program", "set", "rep"],
  maya: ["meal", "food", "macro", "protein", "calorie", "diet", "hydrat", "nutrition"],
  leo: ["physique", "posture", "photo", "muscle", "body", "score", "progress"],
  kai: ["mood", "motivat", "feel", "habit", "check-in", "friend", "streak"],
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

function scoreItem(
  item: StructuredMemoryItem,
  coach?: string,
  intent?: string,
): number {
  const text = itemText(item);
  let score = 1; // baseline so non-empty items can still fill slots

  if (coach) {
    const keys = COACH_KEYWORDS[coach.toLowerCase()] ?? [];
    for (const k of keys) {
      if (text.includes(k)) score += 2;
    }
    if (item.source.toLowerCase().includes(coach.toLowerCase())) score += 1;
  }

  if (intent) {
    const keys = INTENT_KEYWORDS[intent.toLowerCase()] ?? [];
    for (const k of keys) {
      if (text.includes(k)) score += 2;
    }
    if (text.includes(intent.toLowerCase().replace(/_/g, " "))) score += 1;
  }

  return score;
}

/**
 * Sanitize then rank by coach/intent keyword relevance.
 * Never returns more than 5 items (hard cap regardless of `limit`).
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

  const ranked = clean
    .map((item, index) => ({
      item,
      index,
      score: scoreItem(item, options.coach, options.intent),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked.slice(0, limit).map((r) => r.item);
}
