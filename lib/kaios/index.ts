/**
 * KAIOS public barrel — context compiler, intent routing, capsules, telemetry.
 * Runtime code must not import from kaios/source (full spec).
 */

export {
  CORE_CAPSULE,
  SAFETY_CAPSULE,
  LOCALIZATION_CAPSULE,
  getLocalePack,
  loadCoachCapsules,
  selectActiveCapsules,
  intentToCapsuleTask,
  coachCapsules,
  selectAlexCapsules,
  selectMayaCapsules,
  selectLeoCapsules,
  selectKaiCapsules,
  selectCouncilCapsules,
} from "@/lib/kaios/capsules";

export {
  resolveIntent,
  needsStructuredOutput,
  outputBudgetFor,
  type CoachId,
  type Intent,
  type ResolveIntentInput,
} from "@/lib/kaios/routing/intent";

export type {
  RuntimeContext,
  BuildRuntimeContextInput,
  ContextTier,
} from "@/lib/kaios/context/types";

export { buildRuntimeContext } from "@/lib/kaios/context/builder";

export {
  compilePrompt,
  type CompiledPrompt,
} from "@/lib/kaios/compiler/prompt";

export {
  estimateCharsToTokens,
  estimateTextTokens,
  buildTokenBreakdown,
  createTokenTelemetryRecord,
  type TokenBreakdown,
  type TokenTelemetryRecord,
} from "@/lib/kaios/telemetry/tokens";

export {
  SCHEMA_VERSION,
  parseKaiosEnvelope,
  parseCasualCoachResponse,
  parseMealAnalysisResponse,
} from "@/lib/kaios/schemas";
