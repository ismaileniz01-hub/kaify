/**
 * DeepSeek automatic prefix cache: identical leading tokens hit in 64-token
 * chunks. Target ≥80% of input tokens in a coach+locale-stable system prefix.
 */

import { estimateTextTokens } from "@/lib/kaios/telemetry/tokens";
import type { ChatTurn } from "@/lib/ai/types";

export const DEEPSEEK_PREFIX_HIT_TARGET = 0.8;
export const DEEPSEEK_CACHE_CHUNK_TOKENS = 64;
export const CACHE_PREFIX_VERSION = "kaios.cache.v1";

export function prefixHitRatio(prefixTokens: number, totalTokens: number): number {
  if (!(totalTokens > 0)) return 1;
  return prefixTokens / totalTokens;
}

export function maxVolatileTokens(prefixTokens: number): number {
  if (!(prefixTokens > 0)) return 0;
  return Math.max(
    0,
    Math.floor((prefixTokens * (1 - DEEPSEEK_PREFIX_HIT_TARGET)) / DEEPSEEK_PREFIX_HIT_TARGET),
  );
}

/** Pad the stable system prefix so DeepSeek 64-token cache chunks align. */
export function padPrefixToCacheChunks(text: string): { text: string; padTokens: number } {
  const tokens = estimateTextTokens(text);
  const rem = tokens % DEEPSEEK_CACHE_CHUNK_TOKENS;
  if (rem === 0) return { text, padTokens: 0 };
  const need = DEEPSEEK_CACHE_CHUNK_TOKENS - rem;
  const pad = `\n${CACHE_PREFIX_VERSION}.pad ${"·".repeat(Math.max(4, need * 4))}`;
  return { text: `${text}${pad}`, padTokens: estimateTextTokens(pad) };
}

export function trimTurnsToTokenBudget(
  turns: ChatTurn[],
  maxTokens: number,
): ChatTurn[] {
  if (maxTokens <= 0 || turns.length === 0) return [];
  const kept: ChatTurn[] = [];
  let used = 0;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (!turn) continue;
    const cost = estimateTextTokens(turn.content);
    if (kept.length > 0 && used + cost > maxTokens) break;
    kept.unshift(turn);
    used += cost;
  }
  return kept;
}
