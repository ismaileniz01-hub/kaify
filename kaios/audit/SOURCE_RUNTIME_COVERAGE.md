# KAIOS Source → Runtime Coverage Audit

**Generated:** 2026-08-16  
**Registry:** `kaios/registry/requirements.json` (475 rows)  
**Regenerate:** `node scripts/kaios-registry/build.mjs`

---

## Methodology

This audit is derived from the **explicit requirement registry** (`kaios/registry/requirements.json`), which is built by `scripts/kaios-registry/build.mjs` from typed source modules (`scripts/kaios-registry/requirements-*.mjs`). Each row maps one canonical behavioral requirement from `kaios/source/01–17_*.md` to:

- `enforcement_type` (CODE, PROMPT_ALWAYS, TOOL, SCHEMA, …)
- `runtime_implementation` (file:symbol path or `none`)
- `status` (COVERED | PARTIAL | MISSING | NOT_APPLICABLE_WITH_REASON)
- optional `notes` explaining gaps

**We do not naively parse markdown specs at audit time.** Source markdown is authoritative for product intent; runtime traceability lives in the registry and capsule modules under `lib/kaios/capsules/`.

Verification layers:

- Registry integrity: `tests/kaios/fidelity/source-coverage-registry.test.ts`
- Prompt contract fidelity: `tests/kaios/fidelity/personality-contracts.test.ts`
- Existing matrix: `tests/kaios/runtime-prompt-matrix.test.ts`, `tests/kaios/capsules.test.ts`

---

## Summary (exact counts from registry JSON)

| Metric | Count |
|--------|------:|
| **Total requirements** | 475 |
| **COVERED** | 326 |
| **PARTIAL** | 111 |
| **MISSING** | 25 |
| **NOT_APPLICABLE_WITH_REASON** | 13 |
| **Applicable** (excludes N/A) | 462 |

### Coach behavior coverage percentages

| Metric | Formula | Result |
|--------|---------|-------:|
| **Strict COVERED %** | COVERED ÷ applicable | **70.56%** (326 / 462) |
| **COVERED + PARTIAL %** | (COVERED + PARTIAL) ÷ applicable | **94.59%** (437 / 462) |

> **Answer:** Of canonical behavioral requirements with applicable runtime enforcement, **70.56%** are strictly **COVERED** and **94.59%** are at least **COVERED or PARTIAL** at runtime.

---

## Per-source-file breakdown

| Source file | COVERED | PARTIAL | MISSING | N/A | Total | COVERED+PARTIAL % | Strict COVERED % |
|-------------|--------:|--------:|--------:|----:|------:|------------------:|-----------------:|
| 01_constitution.md | 17 | 11 | 1 | 0 | 29 | 96.6% | 58.6% |
| 02_core_identity.md | 20 | 7 | 0 | 0 | 27 | 100.0% | 74.1% |
| 03_memory_engine.md | 10 | 9 | 3 | 0 | 22 | 86.4% | 45.5% |
| 04_context_engine.md | 12 | 10 | 0 | 0 | 22 | 100.0% | 54.5% |
| 05_localization.md | 14 | 6 | 0 | 0 | 20 | 100.0% | 70.0% |
| 06_safety.md | 17 | 4 | 1 | 0 | 22 | 95.5% | 77.3% |
| 07_communication.md | 18 | 2 | 0 | 0 | 20 | 100.0% | 90.0% |
| 08_event_engine.md | 6 | 6 | 8 | 0 | 20 | 60.0% | 30.0% |
| 09_coach_council.md | 19 | 3 | 0 | 0 | 22 | 100.0% | 86.4% |
| 10_output_contracts.md | 17 | 5 | 0 | 0 | 22 | 100.0% | 77.3% |
| 11_alex.md | 38 | 3 | 3 | 1 | 45 | 93.2% | 86.4% |
| 12_maya.md | 28 | 9 | 2 | 1 | 40 | 94.9% | 71.8% |
| 13_leo.md | 27 | 9 | 2 | 1 | 39 | 94.7% | 71.8% |
| 14_kai.md | 45 | 5 | 0 | 1 | 51 | 100.0% | 90.2% |
| 15_tools_and_vision.md | 10 | 10 | 5 | 0 | 25 | 80.0% | 40.0% |
| 16_testing_and_release.md | 9 | 4 | 0 | 9 | 22 | 100.0%* | 69.2%* |
| 17_token_economy.md | 19 | 8 | 0 | 0 | 27 | 100.0% | 70.4% |

\*16_testing_and_release: 100% COVERED+PARTIAL of the 13 applicable rows (9 rows are NOT_APPLICABLE_WITH_REASON release-process documentation).

---

## Recent registry updates (this audit cycle)

| ID | Change | Notes |
|----|--------|-------|
| `04.context.tier0_casual` | PARTIAL → **COVERED** | Intent+cue based continuity; bare greetings tier 0; `CONTINUITY_CUE_RE` restores history/memory |
| `13.leo.composed_not_hype` | PARTIAL → **COVERED** | `LEO_VOICE` + `lib/ai/personas.ts` `ANALYSIS_PERSONAS.leo` fixed to composed tone |
| `09.council.role_digests` | MISSING → **PARTIAL** | `selectCouncilCapsules` returns `COUNCIL_ROLE_DIGESTS`; `runCouncilTurn` still injects `COUNCIL_CORE` only |
| `14.kai.rich_episodic` | **PARTIAL** (note updated) | `KAI_MODE_MEMORY` present; tier-0 bare greetings drop history; continuity cues restore tier 2 |

---

## Runtime architecture notes

- **Layered capsules restored** for Kai, Alex, Maya, Leo, and Council under `lib/kaios/capsules/{coach}/index.ts`.
- **Leo tone:** `ANALYSIS_PERSONAS.leo` aligned with composed/analytical `LEO_VOICE` (no hype-coach persona).
- **Casual continuity:** intent + continuity-cue based (`CONTINUITY_CUE_RE`, `needsContinuity`) — not permanent motivation on greetings.
- **Output budgets:** classified by conversational need via `classifyOutputBudget` / `outputBudgetFor` (micro / casual / support / memory / detailed) — exported from `lib/kaios/index.ts`.

---

## Top MISSING product gaps (25 total)

| ID | Gap |
|----|-----|
| `01.tools.no_false_claims` | Tool success not enforced in chat loop |
| `03.memory.episodic_meaningful` | No meaningful-moment filter at write time |
| `03.memory.progressive_retrieval` | No progressive retrieval pipeline |
| `03.memory.compression_over_time` | No episodic compression over time |
| `06.safety.tool_failure_explicit` | Tool failures not surfaced to model in chat |
| `08.events.relevance_matrix` | Event relevance routing not implemented |
| `08.events.structured_handoffs` | Cross-coach structured handoffs missing |
| `08.events.compact_context` | Full event objects not compacted for context |
| `08.events.meal_saved_handler` | `meal_saved` handler not deterministic |
| `08.events.workout_completed_handler` | `workout_completed` aggregates missing |
| `08.events.physique_scored_handler` | `physique_scored` trend context missing |
| `08.events.durable_store` | Events not persisted beyond in-process buffer |
| `08.events.weekly_aggregates` | Weekly aggregates not fed to council/planning |
| `11.alex.narrow_retrieval` | Exercise search tool not called from orchestrator |
| `11.alex.validate_before_apply` | Library validation not invoked from chat |
| `11.alex.no_hallucinated_ids` | Structured prescriptions not validated at runtime |
| `12.maya.saved_only_after_tool` | Save claims not bound to tool success |
| `12.maya.canonical_daily_totals` | Daily totals not from canonical nutrition state |
| `13.leo.alex_handoff` | No structured Leo→Alex priority handoff |
| `13.leo.history_tool` | `getPhysiqueHistory` not called from analysis path |
| `15.tools.least_privilege` | Tools not routed per coach in chat |
| `15.tools.purposeful_calls` | Tool calls not wired in orchestrator |
| `15.tools.failure_explicit` | Tool failure not explicit to model |
| `15.tools.narrow_exercise_search` | Narrow exercise search unwired |
| `15.tools.get_nutrition_state` | Nutrition state tool unwired |

---

## Top PARTIAL gaps (focus areas)

### Tools not wired to chat loop

- `02.alex.library_only`, `02.maya.confirm_before_save`, `06.safety.code_enforcement`, `06.safety.least_privilege_tools`, `06.safety.confirmation_binding`, `15.tools.*` — tools and pending-action state exist but `orchestrateCoachChat` does not invoke `executeTool`.

### Event engine (08_event_engine.md — 60% COVERED+PARTIAL)

- Skeletal in-memory emitter; handlers for `meal_saved`, `workout_completed`, `physique_scored`, durable store, and weekly aggregates remain PARTIAL/MISSING.

### Nutrition `model_estimate` (Maya)

- Capsules enforce `provenance=model_estimate` and `never_claim_save_without_tool_success` in prompts (`12_maya.md` — 94.9% COVERED+PARTIAL).
- Runtime gap: `12.maya.canonical_daily_totals` MISSING; save path PARTIAL until tools wired.

### Locale resolver not on chat path (05_localization.md)

- `lib/kaios/localization/resolve.ts` implemented and tested in isolation.
- `05.locale.resolution_priority`, `05.locale.no_silent_overwrite`, `05.locale.short_no_switch`, `05.locale.kai_mid_thread` — PARTIAL because `chat.service.ts` uses profile locale only.

### Council role digests

- **PARTIAL:** compiler path (`selectCouncilCapsules`) includes `COUNCIL_ROLE_DIGESTS`; legacy council turn machine (`runCouncilTurn`) still omits them.

### Kai episodic memory

- **PARTIAL:** `KAI_MODE_MEMORY` capsule + tier gating; richest episodic path not fully differentiated from other coaches in application code.

---

## Verification commands

```bash
node scripts/kaios-registry/build.mjs
npx vitest run tests/kaios/fidelity
npx vitest run tests/kaios/runtime-prompt-matrix.test.ts tests/kaios/capsules.test.ts
```
