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
| **COVERED** | 360 |
| **PARTIAL** | 87 |
| **MISSING** | 15 |
| **NOT_APPLICABLE_WITH_REASON** | 13 |
| **Applicable** (excludes N/A) | 462 |

### Coach behavior coverage percentages

| Metric | Formula | Result |
|--------|---------|-------:|
| **Strict COVERED %** | COVERED ÷ applicable | **77.92%** (360 / 462) |
| **COVERED + PARTIAL %** | (COVERED + PARTIAL) ÷ applicable | **96.75%** (447 / 462) |

> **Answer:** Of canonical behavioral requirements with applicable runtime enforcement, **77.92%** are strictly **COVERED** and **96.75%** are at least **COVERED or PARTIAL** at runtime.

### Runtime integrity closure (2026-08-16)

Registry statuses updated after wiring **bounded tool dispatch**, **action-truth scrubbing**, **locale resolution**, **safety-state injection**, **Leo synthesis capsules**, **Council Kai mode**, **Kai familiarity stages**, and **Maya confirm/save truth** in the live orchestrator paths. Event engine, 90-day memory compression, and trusted nutrition DB rows remain PARTIAL/MISSING by design.

---

## Per-source-file breakdown

| Source file | COVERED | PARTIAL | MISSING | N/A | Total | COVERED+PARTIAL % | Strict COVERED % |
|-------------|--------:|--------:|--------:|----:|------:|------------------:|-----------------:|
| 01_constitution.md | 20 | 9 | 0 | 0 | 29 | 100.0% | 69.0% |
| 02_core_identity.md | 21 | 6 | 0 | 0 | 27 | 100.0% | 77.8% |
| 03_memory_engine.md | 10 | 9 | 3 | 0 | 22 | 86.4% | 45.5% |
| 04_context_engine.md | 13 | 9 | 0 | 0 | 22 | 100.0% | 59.1% |
| 05_localization.md | 19 | 1 | 0 | 0 | 20 | 100.0% | 95.0% |
| 06_safety.md | 20 | 2 | 0 | 0 | 22 | 100.0% | 90.9% |
| 07_communication.md | 18 | 2 | 0 | 0 | 20 | 100.0% | 90.0% |
| 08_event_engine.md | 6 | 6 | 8 | 0 | 20 | 60.0% | 30.0% |
| 09_coach_council.md | 20 | 2 | 0 | 0 | 22 | 100.0% | 90.9% |
| 10_output_contracts.md | 18 | 4 | 0 | 0 | 22 | 100.0% | 81.8% |
| 11_alex.md | 41 | 2 | 1 | 1 | 45 | 97.7% | 93.2% |
| 12_maya.md | 31 | 8 | 0 | 1 | 40 | 100.0% | 79.5% |
| 13_leo.md | 30 | 6 | 2 | 1 | 39 | 94.7% | 78.9% |
| 14_kai.md | 47 | 3 | 0 | 1 | 51 | 100.0% | 94.0% |
| 15_tools_and_vision.md | 18 | 6 | 1 | 0 | 25 | 96.0% | 72.0% |
| 16_testing_and_release.md | 9 | 4 | 0 | 9 | 22 | 100.0%* | 69.2%* |
| 17_token_economy.md | 19 | 8 | 0 | 0 | 27 | 100.0% | 70.4% |

\*16_testing_and_release: 100% COVERED+PARTIAL of the 13 applicable rows (9 rows are NOT_APPLICABLE_WITH_REASON release-process documentation).

---

## Recent registry updates (this audit cycle)

| ID | Change | Notes |
|----|--------|-------|
| `01.tools.no_false_claims` | MISSING → **COVERED** | action-truth + scrubFalseSuccessClaims + bounded dispatch in orchestrator |
| `06.safety.tool_failure_explicit` | MISSING → **COVERED** | executeTool FAILED surfaced; scrub prevents success claims |
| `12.maya.saved_only_after_tool` / `12.maya.confirm_before_save` | MISSING/PARTIAL → **COVERED** | saveMealMacros PENDING_CONFIRMATION wired via orchestrator |
| `05.locale.*` (resolution, short-no-switch, council, kai mid-thread) | PARTIAL → **COVERED** | resolveActiveLocale wired in chat/council/analysis |
| `13.leo.gemini_observes_leo_evaluates` / no_flattery / praise_not_automatic | PARTIAL → **COVERED** | Leo KAIOS capsules in buildSynthesisMessages |
| `09.council.kai_council_mode` / `14.kai.council_moderator` | PARTIAL → **COVERED** | KAI_MODE_COUNCIL in runCouncilTurn |
| `14.kai.familiarity_stages` | PARTIAL → **COVERED** | resolveKaiFamiliarityStage + userState injection |
| `15.tools.router` / least_privilege / purposeful_calls | PARTIAL/MISSING → **COVERED** | Bounded dispatch + per-coach allowlist + prefetch |
| `04.context.tier0_casual` | PARTIAL → **COVERED** | Intent+cue based continuity; bare greetings tier 0; `CONTINUITY_CUE_RE` restores history/memory |
| `13.leo.composed_not_hype` | PARTIAL → **COVERED** | `LEO_VOICE` + `lib/ai/personas.ts` `ANALYSIS_PERSONAS.leo` fixed to composed tone |

---

## Runtime architecture notes

- **Layered capsules restored** for Kai, Alex, Maya, Leo, and Council under `lib/kaios/capsules/{coach}/index.ts`.
- **Bounded tool dispatch:** `prefetchToolKnowledge` + `dispatchPostModelTools` in orchestrator; per-coach allowlist; action-truth scrub.
- **Locale resolution:** `resolveActiveLocale` on chat, council, and analysis paths.
- **Safety state:** `splitSafetyAndGeneralState` injects allergies/limitations regardless of context tier.
- **Leo synthesis:** KAIOS Leo capsules in `buildSynthesisMessages`; composed tone (no hype-coach persona).
- **Council Kai mode:** `KAI_MODE_COUNCIL` injected in `runCouncilTurn`.
- **Kai familiarity:** `resolveKaiFamiliarityStage` → userState → `KAI_RELATIONSHIP` capsule.
- **Casual continuity:** intent + continuity-cue based (`CONTINUITY_CUE_RE`, `needsContinuity`) — not permanent motivation on greetings.
- **Output budgets:** classified by conversational need via `classifyOutputBudget` / `outputBudgetFor` (micro / casual / support / memory / detailed) — exported from `lib/kaios/index.ts`.

---

## Top MISSING product gaps (15 total)

| ID | Gap |
|----|-----|
| `03.memory.episodic_meaningful` | No meaningful-moment filter at write time |
| `03.memory.progressive_retrieval` | No progressive retrieval pipeline |
| `03.memory.compression_over_time` | No episodic compression over time |
| `08.events.relevance_matrix` | Event relevance routing not implemented |
| `08.events.structured_handoffs` | Cross-coach structured handoffs missing |
| `08.events.compact_context` | Full event objects not compacted for context |
| `08.events.meal_saved_handler` | `meal_saved` handler not deterministic |
| `08.events.workout_completed_handler` | `workout_completed` aggregates missing |
| `08.events.physique_scored_handler` | `physique_scored` trend context missing |
| `08.events.durable_store` | Events not persisted beyond in-process buffer |
| `08.events.weekly_aggregates` | Weekly aggregates not fed to council/planning |
| `11.alex.narrow_retrieval` | Exercise search only on substitute-intent prefetch |
| `13.leo.alex_handoff` | No structured Leo→Alex priority handoff |
| `13.leo.history_tool` | `getPhysiqueHistory` not called from analysis path |
| `15.tools.narrow_exercise_search` | Narrow exercise search not on all programming paths |

---

## Top PARTIAL gaps (focus areas)

### Event engine (08_event_engine.md — 60% COVERED+PARTIAL)

- Skeletal in-memory emitter; handlers for `meal_saved`, `workout_completed`, `physique_scored`, durable store, and weekly aggregates remain PARTIAL/MISSING.

### Nutrition `model_estimate` (Maya)

- Capsules enforce `provenance=model_estimate` honesty (`12_maya.md` — 100% COVERED+PARTIAL).
- Runtime gap: trusted food DB lookup still absent (`12.maya.pipeline_order`, `15.tools.nutrition_pipeline` remain PARTIAL).

### Progressive memory / 90-day continuity

- `03.memory.progressive_retrieval`, `03.memory.compression_over_time`, `01.relationship.ninety_day_continuity` — PARTIAL/MISSING; cap-5 single-pass select only.

### Residual tool paths

- `11.alex.narrow_retrieval` / `15.tools.narrow_exercise_search` — search prefetch only on substitute-intent heuristics, not all programming turns.
- `13.leo.history_tool` — physique history prefetch exists for Leo chat intent but not analysis.service path.
- `06.safety.code_enforcement` — PARTIAL; bounded writes limited to save/hydration path (no program apply).

### Council / Kai episodic memory

- **PARTIAL:** `14.kai.rich_episodic` — richest episodic path not fully differentiated from other coaches in application code.

---

## Verification commands

```bash
node scripts/kaios-registry/build.mjs
npx vitest run tests/kaios/fidelity
npx vitest run tests/kaios/runtime-prompt-matrix.test.ts tests/kaios/capsules.test.ts
```
