import type { ChatTurn } from "@/lib/ai/types";
import type { CoachId, Intent } from "@/lib/kaios/routing/intent";
import type { TokenBreakdown } from "@/lib/kaios/telemetry/tokens";

/** Context depth: 0 casual → 3 program/council. */
export type ContextTier = 0 | 1 | 2 | 3;

export type RuntimeContext = {
  coach: CoachId;
  intent: Intent;
  locale: string;
  tier: ContextTier;
  /** Active coach + task capsules (CORE/SAFETY applied in the compiler). */
  capsules: string[];
  userState?: string;
  memoryItems?: string[];
  /** Compact structured teammate facts — never full other-coach personalities. */
  teamFacts?: string[];
  knowledge?: string[];
  conversationTurns?: ChatTurn[];
  userMessage: string;
  outputSchemaName?: string;
  maxTokens: number;
  /** Section token estimates (chars/4). */
  breakdown: TokenBreakdown;
};

export type BuildRuntimeContextInput = {
  coach: CoachId;
  message: string;
  locale?: string;
  intent?: Intent;
  route?: string;
  hasImage?: boolean;
  workflow?: string;
  userState?: string;
  memoryItems?: string[];
  teamFacts?: string[];
  knowledge?: string[];
  conversationTurns?: ChatTurn[];
  outputSchemaName?: string;
};
