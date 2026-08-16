/** Compact requirement row builder. */
export function row(
  id,
  source_file,
  source_section,
  requirement,
  owner,
  enforcement_type,
  runtime_implementation,
  status,
  test = "none",
  notes,
) {
  const o = {
    id,
    source_file,
    source_section,
    requirement,
    owner,
    enforcement_type,
    runtime_implementation,
    test,
    status,
  };
  if (notes) o.notes = notes;
  return o;
}

export const SHARED = {
  CORE: "lib/kaios/capsules/core.ts:CORE_CAPSULE",
  SAFETY: "lib/kaios/capsules/safety.ts:SAFETY_CAPSULE",
  LOCALE: "lib/kaios/capsules/localization.ts",
  COMPILER: "lib/kaios/compiler/prompt.ts:compilePrompt",
  CONTEXT: "lib/kaios/context/builder.ts:buildRuntimeContext",
  ORCH: "lib/kaios/orchestrator/request.ts:orchestrateCoachChat",
  MEMORY: "lib/kaios/memory/index.ts",
  TOOLS: "lib/kaios/tools/index.ts:executeTool",
  EVENTS: "lib/kaios/events/index.ts",
  SCHEMA: "lib/kaios/schemas/envelope.ts",
  INTENT: "lib/kaios/routing/intent.ts",
  TELEM: "lib/kaios/telemetry/tokens.ts",
  COUNCIL: "lib/kaios/council/turns.ts:runCouncilTurn",
  NONE: "none",
};
