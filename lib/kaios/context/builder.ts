import { selectActiveCapsules } from "@/lib/kaios/capsules";
import {
  outputBudgetFor,
  resolveIntent,
  type Intent,
} from "@/lib/kaios/routing/intent";
import {
  buildTokenBreakdown,
  estimateCharsToTokens,
  estimateTextTokens,
} from "@/lib/kaios/telemetry/tokens";
import { splitSafetyAndGeneralState } from "@/lib/kaios/context/safety-state";
import type {
  BuildRuntimeContextInput,
  ContextTier,
  RuntimeContext,
} from "@/lib/kaios/context/types";

const MAX_MEMORY_ITEMS = 5;

/** Pure greetings that do not need relationship continuity. */
const BARE_GREETING_RE =
  /^(?:hi|hello|hey|yo|sup|selam|merhaba|sa|naber|günaydın|iyi akşamlar|iyi geceler|what's up|whats up|nasılsın|nasilsin|how are you|how're you)(?:[\s,]+(?:hi|hello|hey|yo|sup|selam|merhaba|naber|nasılsın|nasilsin|what's up|whats up|how are you|how're you|naber|iyi misin|iyi misin))?(?:[\s!.?]*)?$/i;

/**
 * Short messages that still need history/memory (not "zero continuity").
 * Intent alone must not strip continuity for contextual casual wording.
 */
const CONTINUITY_CUE_RE =
  /\b(hatırlıyor|hatirliyor|remember|yine|same|yine olmadı|yine olmadi|boktan|same shit|dün|dun|geçen|gecen|last (?:time|week|night)|you said|demiştin|demistin|again|hala|hâlâ|still)\b/i;

function isGreetingLike(message: string): boolean {
  const msg = message.trim();
  if (msg.length === 0) return true;
  if (BARE_GREETING_RE.test(msg)) return true;
  // Short social ping without continuity cues.
  if (msg.length <= 48 && !CONTINUITY_CUE_RE.test(msg)) {
    return /^(hi|hello|hey|yo|sup|selam|merhaba|naber|sa|nasılsın|nasilsin)\b/i.test(
      msg,
    );
  }
  return false;
}

function needsContinuity(
  intent: Intent,
  message: string,
  input: BuildRuntimeContextInput,
): boolean {
  const msg = message.trim();
  if (CONTINUITY_CUE_RE.test(msg)) return true;
  if (/\b(remember|hatır)\b/i.test(msg)) return true;
  if (intent === "unknown") return true;
  if (intent === "motivation" || intent === "hydration") return true;
  // Casual greetings stay zero-continuity; other casual wording may keep thread.
  if (intent === "casual") {
    if (isGreetingLike(msg)) return false;
    return (
      (input.conversationTurns?.length ?? 0) > 0 ||
      (input.memoryItems?.length ?? 0) > 0
    );
  }
  return false;
}

function resolveTier(
  intent: Intent,
  input: BuildRuntimeContextInput,
): ContextTier {
  if (
    intent === "programming" ||
    intent === "council_turn" ||
    intent === "council_decision" ||
    intent === "meal_plan" ||
    intent === "tool_action"
  ) {
    return 3;
  }

  const continuity = needsContinuity(intent, input.message, input);
  const hasMemory = (input.memoryItems?.length ?? 0) > 0;
  const hasHistory = (input.conversationTurns?.length ?? 0) > 0;

  // Bare greetings stay tier 0 (no history/memory).
  if (intent === "casual" && !continuity) return 0;

  if (continuity && (hasMemory || hasHistory)) return 2;
  if (hasMemory || hasHistory) return 2;

  if (input.userState?.trim()) return 1;

  if (intent === "motivation" || intent === "hydration") return 1;

  if (intent === "casual" && continuity && input.userState?.trim()) return 1;

  return continuity ? 1 : 0;
}

function compactTeamFacts(facts: string[] | undefined): string[] | undefined {
  if (!facts || facts.length === 0) return undefined;
  // Keep short structured lines only; drop anything that looks like a full persona dump.
  const compact = facts
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && f.length <= 180)
    .filter((f) => !/you are (alex|maya|leo|kai)\b/i.test(f))
    .slice(0, 6);
  return compact.length > 0 ? compact : undefined;
}

/**
 * Selects only the blocks justified by intent + tier and estimates section tokens.
 */
export function buildRuntimeContext(
  input: BuildRuntimeContextInput,
): RuntimeContext {
  const intent =
    input.intent ??
    resolveIntent({
      coach: input.coach,
      message: input.message,
      route: input.route,
      hasImage: input.hasImage,
      workflow: input.workflow,
    });

  const tier = resolveTier(intent, input);
  const locale = input.locale?.trim() || "en";
  const capsules = selectActiveCapsules(input.coach, intent, input.message);
  const maxTokens = outputBudgetFor(intent, input.message);

  const { safetyState, generalState } = splitSafetyAndGeneralState(
    input.userState,
  );

  // Canonical safety state always survives tier-0 pruning.
  const userStateParts: string[] = [];
  if (safetyState) userStateParts.push(safetyState);
  if (tier >= 1 && generalState) userStateParts.push(generalState);
  else if (tier >= 1 && input.userState?.trim() && !safetyState && !generalState) {
    userStateParts.push(input.userState.trim());
  }
  const userState =
    userStateParts.length > 0 ? userStateParts.join("; ") : undefined;

  const memoryItems =
    tier >= 2 && input.memoryItems && input.memoryItems.length > 0
      ? input.memoryItems
          .map((m) => m.trim())
          .filter(Boolean)
          .slice(0, MAX_MEMORY_ITEMS)
      : undefined;

  const conversationTurns =
    tier >= 2 && input.conversationTurns && input.conversationTurns.length > 0
      ? input.conversationTurns
      : undefined;

  const teamFacts =
    tier >= 3 ? compactTeamFacts(input.teamFacts) : undefined;

  // Knowledge from tool prefetch may appear at tier < 3 for nutrition/read tools.
  const knowledge =
    input.knowledge && input.knowledge.length > 0
      ? input.knowledge
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, tier >= 3 ? 8 : 4)
      : undefined;

  const outputSchemaName =
    input.outputSchemaName ??
    (intent === "meal_analysis"
      ? "meal_analysis"
      : intent === "physique_analysis"
        ? "physique_analysis"
        : intent === "council_decision"
          ? "council_decision"
          : intent === "tool_action"
            ? "tool_action"
            : undefined);

  // Rough section estimates for telemetry (compiler refines after wrapping).
  const capsuleText = capsules.join("\n\n");
  const trustedText = [
    userState ?? "",
    ...(memoryItems ?? []),
    ...(teamFacts ?? []),
  ]
    .filter(Boolean)
    .join("\n");
  const knowledgeText = (knowledge ?? []).join("\n");
  const historyText = (conversationTurns ?? [])
    .map((t) => t.content)
    .join("\n");
  const localeText = `Locale: ${locale}`;
  const outputHintText = outputSchemaName
    ? `Output contract: ${outputSchemaName}`
    : "";

  const breakdown = buildTokenBreakdown({
    // Pre-compile heuristics; compilePrompt measures real CORE/SAFETY strings.
    core: estimateCharsToTokens(480),
    safety: estimateCharsToTokens(880),
    capsules: estimateTextTokens(capsuleText),
    locale: estimateTextTokens(localeText),
    trusted: estimateTextTokens(trustedText),
    knowledge: estimateTextTokens(knowledgeText),
    outputHint: estimateTextTokens(outputHintText),
    history: estimateTextTokens(historyText),
    userMessage: estimateTextTokens(input.message),
  });

  return {
    coach: input.coach,
    intent,
    locale,
    tier,
    capsules,
    userState,
    memoryItems,
    teamFacts,
    knowledge,
    conversationTurns,
    userMessage: input.message,
    outputSchemaName,
    maxTokens,
    breakdown,
  };
}
