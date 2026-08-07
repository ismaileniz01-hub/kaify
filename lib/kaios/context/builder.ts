import { selectActiveCapsules } from "@/lib/kaios/capsules";
import {
  outputBudgetFor,
  resolveIntent,
  type Intent,
} from "@/lib/kaios/routing/intent";
import {
  buildTokenBreakdown,
  estimateTextTokens,
} from "@/lib/kaios/telemetry/tokens";
import type {
  BuildRuntimeContextInput,
  ContextTier,
  RuntimeContext,
} from "@/lib/kaios/context/types";

const MAX_MEMORY_ITEMS = 5;

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

  if (intent === "casual") return 0;

  const hasMemory = (input.memoryItems?.length ?? 0) > 0;
  const hasHistory = (input.conversationTurns?.length ?? 0) > 0;
  if (hasMemory || hasHistory) return 2;

  if (input.userState?.trim()) return 1;

  if (intent === "motivation" || intent === "hydration") return 1;

  return 0;
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
  const capsules = selectActiveCapsules(input.coach, intent);
  const maxTokens = outputBudgetFor(intent);

  const userState =
    tier >= 1 && input.userState?.trim()
      ? input.userState.trim()
      : undefined;

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

  const knowledge =
    tier >= 3 && input.knowledge && input.knowledge.length > 0
      ? input.knowledge.map((k) => k.trim()).filter(Boolean).slice(0, 8)
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
    core: estimateTextTokens(120), // placeholder; compiler overwrites with real CORE
    safety: estimateTextTokens(220),
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
