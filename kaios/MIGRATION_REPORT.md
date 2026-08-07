# KAIOS Migration Report

## Architecture Implemented

- Design-time specs live under `kaios/source/` (not runtime prompts).
- Runtime capsules under `lib/kaios/capsules/` compiled by `lib/kaios/compiler/prompt.ts`.
- Context Builder (`lib/kaios/context/builder.ts`) + deterministic intent routing (`lib/kaios/routing/intent.ts`).
- Orchestrator (`lib/kaios/orchestrator/request.ts`) wired into `chat.service` when `AI_FEATURES.kaiosRuntime` (env `KAIOS_RUNTIME`, **default true**).
- Vision: Gemini observation prompts → NutritionDataProvider / Leo eval → coach synthesis.
- Council: interactive `runCouncilTurn` with `await_user` + minimum FE composer.
- Schemas: Zod envelopes in `lib/kaios/schemas/envelope.ts`.

## Legacy AI Removed / Bypassed

| Legacy | Status |
| --- | --- |
| DB personality + `COACH_CHAT_VOICE` injection | Bypassed on KAIOS path (still reachable if `KAIOS_RUNTIME=false`) |
| `syncAgents` multi-persona prose | Replaced with compact `teamFacts` on KAIOS path |
| `structured-chat` second LLM card call | **Not used** on KAIOS path; cards from same inference |
| One-shot team meeting voices | Replaced by interactive Council when KAIOS on |
| Gemini-as-coach speech | Observation prompts; coaches interpret |

Rollback: set `KAIOS_RUNTIME=false`. Final cleanup should delete legacy path after soak.

## Runtime Prompt System

Order: core → safety → active coach capsules → locale → trusted state/memory/team facts → knowledge → output hint → history → user message.

One active coach capsule set per normal chat. Full `kaios/source` never imported by runtime (enforced by `tests/kaios/no-full-spec-runtime.test.ts`).

## Token Economy

- Phase 0 baseline: `kaios/baseline/pre-migration.json` (static; live keys absent).
- Phase 9 post: `kaios/baseline/post-migration.json`.
- Intent-aware `max_tokens` via `outputBudgetFor`.
- Program requests: **1** model call (was up to 3 with card+analytics).
- Casual analytics extract still optional behind `AI_CHAT_ANALYTICS` for text-only turns.

## Models

- Conversational: DeepSeek (stream for casual; single complete JSON for structured).
- Vision: Gemini JSON observations only.
- No translation LLM pass. No personality rewrite pass.

## Memory

- `prepareMemoriesForContext` = sanitize poison + select ≤5.
- Condensation service retained for storage; injection is selective.

## Nutrition

- `NutritionDataProvider` interface; current impl = `model_estimate` only.
- **No invented trusted food DB / hardcoded nutrient tables.**
- Provenance stored on analysis payload when present.

## Tools

- Narrow router stub + exercise search/ID validation (`lib/kaios/tools`, `lib/kaios/exercises`).
- Writes remain confirmation-gated (Maya analytics confirmation).

## Council

- Interactive turns with `await_user`.
- Team page shows composer when waiting (minimum FE; no premium redesign).

## Tests

`npx vitest run tests/kaios` — 40+ tests including capsules, schemas, intent, compiler, no-full-spec, nutrition, memory poison, vision prompts, exercise ids, orchestrator flag.

## Remaining Issues

1. Full 17 source `.md` files were not present in the cloud workspace Downloads path; `kaios/source/README.md` holds module index — check in full specs from local Downloads when available.
2. Trusted nutrition catalog still missing — honest `model_estimate` fallback only.
3. Legacy prompt path still exists behind `KAIOS_RUNTIME=false` (intentional rollback); delete after soak.
4. Event Engine / tool writes beyond exercise search are stubs.
5. Live provider token telemetry before/after not captured (no API keys in CI env).
6. Leo radial redesign / Team Decision polish deferred (by plan).
