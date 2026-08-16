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
  classifyOutputBudget,
  type CoachId,
  type Intent,
  type ResolveIntentInput,
  type OutputBudgetClass,
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

export {
  getNutritionProvider,
  type NutritionDataProvider,
  type FoodObservation,
  type MacroResult,
  type NutritionProvenance,
} from "@/lib/kaios/nutrition";

export {
  selectRelevantMemories,
  sanitizeMemories,
  prepareMemoriesForContext,
  parseStructuredFacts,
  type StructuredMemoryItem,
} from "@/lib/kaios/memory";

export {
  buildFoodObservationPrompt,
  buildPhysiqueObservationPrompt,
  buildImageQualityPrompt,
  normalizeFoodObservation,
  normalizePhysiqueObservation,
} from "@/lib/kaios/vision";

export {
  getExerciseCatalog,
  searchExercises,
  assertExerciseIdsExist,
  type CatalogExercise,
} from "@/lib/kaios/exercises";

export {
  executeTool,
  validateProgramExerciseIds,
  type ToolName,
  type ToolRequest,
  type ToolResult,
} from "@/lib/kaios/tools";

export {
  toolsAllowedForCoach,
  isToolAllowedForCoach,
  mapActionTypeToTool,
} from "@/lib/kaios/tools/allowlist";

export {
  enforceActionTruthOnPayload,
  scrubFalseSuccessClaims,
  type ActionLifecycle,
  type ActionTruthRecord,
} from "@/lib/kaios/tools/action-truth";

export { resolveActiveLocale, isNonSwitchingExpression } from "@/lib/kaios/localization/resolve";

export { resolveKaiFamiliarityStage } from "@/lib/kaios/kai/familiarity";

export { splitSafetyAndGeneralState } from "@/lib/kaios/context/safety-state";

export {
  orchestrateCoachChat,
  type OrchestrateChatInput,
  type OrchestrateResultMeta,
} from "@/lib/kaios/orchestrator";
