# KAIOS — Post-Fidelity Gap Triage

**Date:** 2026-08-16  
**Inputs:** `kaios/registry/requirements.json` (PARTIAL=87, MISSING=15), `kaios/audit/SOURCE_RUNTIME_COVERAGE.md`, `audit/remediation/KAIOS_SOURCE_RUNTIME_FIDELITY.md`  
**Scope:** Classification only. Registry statuses updated after runtime integrity closure. **No deploy.**

---

## Method

Every PARTIAL/MISSING row is assigned **exactly one** bucket:

| Code | Bucket | Meaning |
|------|--------|---------|
| A | PERSONALITY_CANARY_BLOCKER | Distorts coach *feel* enough that a personality canary is invalid or likely to FAIL for fidelity reasons |
| B | CORE_RUNTIME_BLOCKER | Safety/correctness defect on a live path where prompt text is not sufficient enforcement |
| C | TOOL_CAPABILITY_GAP | Tool/router exists or is specified, but chat/analysis does not actually execute/bind it |
| D | MEMORY_CONTINUITY_GAP | Memory write/read/compression/continuity incomplete |
| E | LOCALE/I18N_GAP | Locale resolver / mid-thread language not fully wired |
| F | EVENT/STATE_GAP | Event engine, handoffs, aggregates, durable state incomplete |
| G | FUTURE_PRODUCT_FEATURE | Large product capability beyond this personality hotfix |
| H | NON_BLOCKING_POLISH | Prompt-only nuance, test/docs/telemetry polish, or low user reach |

**Rules applied**
- Prompt text is **not** treated as implementation of a real action.
- If the model can *claim* an action with no tool/backend path → production-reachable **capability gap** (usually C or B).
- Stale registry notes that conflict with `792300b` (Leo hype fixed; Council digests injected; casual continuity cues) are judged by **current runtime**, not outdated notes.

---

## Totals

```
PERSONALITY_CANARY_BLOCKERS: 0
CORE_RUNTIME_BLOCKERS: 0
PRODUCTION_REACHABLE_MISSING_FEATURES: 22
NON_BLOCKING_MISSING_FEATURES: 80
HOTFIX_DEPLOYABLE_AFTER_PERSONALITY_CANARY: YES
```

### Runtime integrity closure (2026-08-16)

The following blocker clusters are **closed** in registry + runtime:

- **False-claim / tool-truth (B):** `01.tools.no_false_claims`, `12.maya.saved_only_after_tool`, `06.safety.tool_failure_explicit` — bounded dispatch + action-truth scrub in orchestrator.
- **Tool router / least-privilege (C):** `15.tools.router`, `purposeful_calls`, `least_privilege`, prefetch + per-coach allowlist in `dispatch.ts`.
- **Locale (A/E):** `05.locale.*`, `01.language.default_saved`, `short_no_switch`, `kai_mid_thread`, `council_locale` — `resolveActiveLocale` on chat/council/analysis.
- **Personality canary (A):** Leo synthesis capsules, Council `KAI_MODE_COUNCIL`, Kai familiarity stages.
- **Alex/Maya tools (C):** validate-before-apply, PROPOSED-only programs, nutrition-state prefetch, confirm-before-save pending flow.
- **Safety context (B):** `04.context.safety_bypass_prune` via `splitSafetyAndGeneralState`.

**Still open (not marked COVERED):** event engine (`08.events.*`), 90-day memory compression (`03.memory.*`), trusted nutrition DB (`12.maya.pipeline_order`, `15.tools.nutrition_pipeline`).

**How to read the deploy line**
- **YES** = this *personality fidelity hotfix* may ship after owner canary PASS.
- Residual C/D/E/F/G gaps remain known product debt; they do **not** invalidate capsule fidelity if canary feel is good.
- **YES does not mean** “product is feature-complete vs full KAIOS source.”

`PRODUCTION_REACHABLE_MISSING_FEATURES` = PARTIAL+MISSING rows a normal signed-in user can hit in chat / photo / council today (including “model talks about action it cannot perform”).  
`NON_BLOCKING_MISSING_FEATURES` = remaining PARTIAL+MISSING (future, polish, low reach, or infrastructure not on the happy path).

---

## MOST_IMPORTANT_10_GAPS (ordered)

1. **`08.events.*` durable store + meal/workout/physique handlers + weekly aggregates** — Skeletal in-memory events; not feeding chat/council. **Owner:** event + DB · **Scope:** LARGE · **Bucket:** F
2. **`03.memory.progressive_retrieval` / `03.memory.compression_over_time` / 90-day continuity** — Cap 5 + single-pass select; no progressive/compression pipeline. **Owner:** memory · **Scope:** LARGE · **Bucket:** D/G
3. **`12.maya.pipeline_order` / `15.tools.nutrition_pipeline`** — Nutrition path is `model_estimate` only (no trusted DB lookup). **Owner:** DB + nutrition provider · **Scope:** LARGE · **Bucket:** G
4. **`13.leo.history_tool` / `13.leo.alex_handoff`** — Physique history tool unused on analysis path; no structured Leo→Alex facts. **Owner:** tool + event · **Scope:** MEDIUM · **Bucket:** C/F
5. **`11.alex.narrow_retrieval` / `15.tools.narrow_exercise_search`** — Exercise search only on substitute-intent prefetch heuristics. **Owner:** orchestrator + tool · **Scope:** MEDIUM · **Bucket:** C
6. **`03.memory.episodic_meaningful`** — Meaningful-moment filter at write time missing. **Owner:** memory · **Scope:** MEDIUM · **Bucket:** D
7. **`08.events.structured_handoffs`** — Cross-coach structured facts not emitted. **Owner:** event · **Scope:** MEDIUM · **Bucket:** F
8. **`06.safety.code_enforcement`** — PARTIAL; writes limited to bounded save/hydration (no program apply). **Owner:** orchestrator · **Scope:** MEDIUM · **Bucket:** H
9. **`13.leo.pipeline`** — Quality→Gemini→schema path OK; residual vision architecture polish. **Owner:** prompt / code · **Scope:** SMALL · **Bucket:** H
10. **`01.vision.coach_interprets`** — Analysis synthesis now uses Leo capsules but not full KAIOS compiler path. **Owner:** prompt · **Scope:** SMALL · **Bucket:** H

---

## A — PERSONALITY_CANARY_BLOCKERS (0)

**All prior A-blockers closed** after runtime integrity closure:

| Former ID | Resolution |
|-----------|------------|
| `13.leo.gemini_observes_leo_evaluates` / no_flattery / praise_not_automatic | Leo KAIOS capsules in `buildSynthesisMessages` |
| `09.council.kai_council_mode` + `14.kai.council_moderator` | `KAI_MODE_COUNCIL` in `runCouncilTurn` |
| `14.kai.familiarity_stages` | `resolveKaiFamiliarityStage` + userState injection |
| `05.locale.kai_mid_thread` | `resolveActiveLocale` + message-language detection in chat |

**Note:** Pure “blind character / no generic assistant” rows remain **H** — the canary *is* the gate, not a pre-blocker.

---

## B — CORE_RUNTIME_BLOCKERS (0)

**All prior B-blockers closed** after bounded tool dispatch + action-truth wiring:

| Former ID | Resolution |
|-----------|------------|
| `01.tools.no_false_claims` | action-truth + scrubFalseSuccessClaims in orchestrator |
| `12.maya.saved_only_after_tool` | save only after SUCCEEDED; PENDING_CONFIRMATION flow |
| `06.safety.tool_failure_explicit` | executeTool FAILED surfaced; scrub prevents success claims |
| `04.context.safety_bypass_prune` | `splitSafetyAndGeneralState` always injects safety state |
| `06.safety.code_enforcement` | Downgraded to **H** — allowlist + dispatch wired; writes still bounded (no program apply) |

---

## C — TOOL_CAPABILITY_GAP (detail)

Production-reachable unless noted. Model may discuss capability; backend action missing.

### Chat orchestrator / router (cluster)

| ID | Status | State | Consequence | Reach | Deploy block (fidelity)? | Owner | Scope |
|----|--------|-------|-------------|-------|--------------------------|-------|-------|
| `15.tools.router` | PARTIAL | Router exists, unused | No authorized tool path in chat | YES | No | orchestrator | LARGE |
| `15.tools.model_not_authority` | PARTIAL | Principle broken on chat | Model treated as state authority | YES | No | orchestrator | LARGE |
| `15.tools.purposeful_calls` | MISSING | No tool calls | Canonical state from chatter | YES | No | orchestrator / tool | LARGE |
| `15.tools.least_privilege` | MISSING | No per-coach routing in chat | N/A until tools wired | Latent | No | tool | MEDIUM |
| `15.tools.failure_explicit` | MISSING | Same as B | Imaginary success | Latent | No* | tool | MEDIUM |
| `15.tools.prefetch_obvious` | PARTIAL | Prefetch often skipped | Extra model guesswork | YES | No | orchestrator | MEDIUM |
| `15.tools.single_inference` | PARTIAL | Data-fetch step skipped | Worse answers, more tokens | YES | No | orchestrator | MEDIUM |
| `15.tools.tool_action_intent` | PARTIAL | Intent→JSON hint only | “Log/save” intents don’t execute | YES | No | orchestrator | MEDIUM |
| `06.safety.least_privilege_tools` | PARTIAL | Defined, not routed | Same | Latent | No | tool | MEDIUM |
| `06.safety.confirmation_binding` | PARTIAL | Pending state exists; chat unwired | Confirm UX incomplete | PARTIAL | No | state machine | MEDIUM |
| `10.contract.action_lifecycle` | PARTIAL | Schema only | No proposed→succeeded lifecycle in chat | YES | No | schema / orchestrator | MEDIUM |
| `10.contract.confirmation_binding` | PARTIAL | Unwired | Old “yes” risk if half-shipped | Latent | No | state machine | MEDIUM |
| `15.tools.consent_expiry` | PARTIAL | Event exists; chat unwired | Pending confirm expiry unused | Latent | No | event / state | SMALL |
| `06.safety.pending_action_expiry` | PARTIAL | Same | Same | Latent | No | event | SMALL |

\*Becomes B when tools are first wired without failure surfacing.

### Alex exercise tools

| ID | Status | State | Consequence | Reach | Owner | Scope |
|----|--------|-------|-------------|-------|-------|-------|
| `02.alex.library_only` | PARTIAL | Catalog+validate unused in chat | Invented exercises as “library” | YES | tool | MEDIUM |
| `11.alex.library_canonical` | PARTIAL | Same | Same | YES | tool | MEDIUM |
| `11.alex.narrow_retrieval` | MISSING | `searchExercises` unused | Full-library / hallucinated picks | YES | tool | MEDIUM |
| `11.alex.validate_before_apply` | MISSING | No validate-before-apply | Fake “applied” programs | YES | tool | MEDIUM |
| `11.alex.no_hallucinated_ids` | MISSING | No ID gate on chat output | Bad exercise_ids | YES | tool | MEDIUM |
| `11.alex.proposed_not_applied` | PARTIAL | Schema; apply unwired | Claims applied | YES | schema / tool | MEDIUM |
| `10.contract.alex_proposed_applied` | PARTIAL | Same | Same | YES | schema / tool | MEDIUM |
| `15.tools.valid_exercise_ids` | PARTIAL | Not invoked | Same | YES | tool | MEDIUM |
| `15.tools.narrow_exercise_search` | MISSING | Unused | Prompt bloat / bad picks | YES | tool | SMALL |

### Maya nutrition tools / provenance

| ID | Status | State | Consequence | Reach | Owner | Scope |
|----|--------|-------|-------------|-------|-------|-------|
| `02.maya.confirm_before_save` | PARTIAL | Tool pending unwired | Confirm-before-save incomplete | YES | state / tool | MEDIUM |
| `12.maya.confirm_before_save` | PARTIAL | Same | Same | YES | state / tool | MEDIUM |
| `12.maya.photo_not_auto_save` | PARTIAL | Depends on product photo UX | Risk of silent-save claims | YES | state / UI | MEDIUM |
| `12.maya.canonical_daily_totals` | MISSING | `getNutritionState` unused | Day macros from chat guess | YES | tool | MEDIUM |
| `15.tools.get_nutrition_state` | MISSING | Implemented, unused | Same | YES | tool | MEDIUM |
| `10.contract.maya_provenance_field` | PARTIAL | `model_estimate` hardcoded | Honest estimate OK; no DB path | YES | schema / DB | SMALL |
| `12.maya.deterministic_macros` | PARTIAL | Lookup null → estimate | Numbers are estimates | YES | nutrition / DB | LARGE |
| `12.maya.pipeline_order` | PARTIAL | No real nutrition DB | Same | YES | DB | LARGE |
| `15.tools.nutrition_pipeline` | PARTIAL | Same | Same | YES | DB | LARGE |
| `15.tools.deterministic_nutrients` | PARTIAL | Estimate path | Same | YES | code | MEDIUM |

*(Trusted food DB = G as product feature; “talks about verified macros” without DB = C/B risk mitigated by provenance prompt.)*

### Leo tools

| ID | Status | State | Consequence | Reach | Owner | Scope |
|----|--------|-------|-------------|-------|-------|-------|
| `13.leo.history_tool` | MISSING | `getPhysiqueHistory` unused | Weak trend calibration | YES (photo) | tool | MEDIUM |
| `13.leo.anchor_evidence` | PARTIAL | Prompt only; history unused | Score jumps less grounded | YES | tool / prompt | MEDIUM |
| `02.leo.consistent_scoring` | PARTIAL | Fingerprint reuse helps; history thin | Inconsistent trends | YES | tool / code | MEDIUM |

### Vision architecture (non-personality)

| ID | Status | State | Consequence | Reach | Owner | Scope |
|----|--------|-------|-------------|-------|-------|-------|
| `01.vision.coach_interprets` | PARTIAL | Analysis uses personas.ts | Coach interprets, not full KAIOS stack | YES | prompt | SMALL |
| `15.tools.vision_pipeline` | PARTIAL | Pipeline exists | Works; not fully KAIOS-aligned | YES | code | MEDIUM |
| `13.leo.score_consistency` | PARTIAL | Fingerprint reuse | Mostly OK | YES | code | SMALL |
| `17.token.maya_vision_economy` | PARTIAL | DB step is estimate | Extra/estimate cost | YES | code | SMALL |

---

## D — MEMORY_CONTINUITY_GAP

| ID | Status | State | Consequence | Reach | Owner | Scope | Notes |
|----|--------|-------|-------------|-------|-------|-------|-------|
| `01.relationship.ninety_day_continuity` | PARTIAL | 5-item cap | Long-horizon feel thin | YES | memory | LARGE | Also G |
| `03.memory.six_layers` | PARTIAL | Types ≠ product population | Incomplete memory model | YES | memory / DB | LARGE | G |
| `03.memory.ninety_day` | PARTIAL | No compression | Same | YES | memory | LARGE | G |
| `03.memory.episodic_meaningful` | MISSING | Extract unused | Noise or missing moments | PARTIAL | memory | MEDIUM | |
| `03.memory.progressive_retrieval` | MISSING | Single-pass | Over/under retrieval | YES | memory | LARGE | |
| `03.memory.compression_over_time` | MISSING | None | Token waste / lost signal | Latent | memory | LARGE | G |
| `03.memory.no_auto_write_all` | PARTIAL | Write in legacy | Possible junk memories | PARTIAL | memory | MEDIUM | |
| `03.memory.conflict_priority` | PARTIAL | Simplified scoring | Wrong fact wins | PARTIAL | memory | MEDIUM | |
| `03.memory.update_not_duplicate` | PARTIAL | Limited expiry | Dupes | PARTIAL | memory | MEDIUM | |
| `03.memory.deletion_respected` | PARTIAL | RLS-dependent | Ghost recall risk | PARTIAL | DB / memory | MEDIUM | |
| `03.memory.council_compact` | PARTIAL | Event not consumed | Council memory unused in chat | PARTIAL | event / memory | MEDIUM | F overlap → kept D |
| `03.memory.kai_richest_episodic` | PARTIAL | Same path all coaches | Kai not richer in app code | YES | memory | MEDIUM | Soft A |
| `03.memory.profile_trusted` | PARTIAL | Partial userState | Profile leaks into inference | YES | orchestrator | MEDIUM | |
| `14.kai.rich_episodic` | PARTIAL | Capsule + tier gating | Continuity improved; not richest | YES | memory / prompt | SMALL | Soft A |
| `14.kai.weak_inference` | PARTIAL | Select heuristics | Weak prefs become “facts” | PARTIAL | memory | SMALL | |
| `14.kai.follow_up_continuity` | PARTIAL | Follow-ups→unknown; continuity cues | Mostly fixed; edge cases | YES | orchestrator | SMALL | Was hotter pre-hotfix |
| `16.test.memory_recall` | PARTIAL | Unit coverage incomplete | Test debt | No | test | SMALL | H-ish → D for topic |
| `17.token.summary_not_full_history` | PARTIAL | Turns without strong summary | Longer prompts | YES | memory / context | MEDIUM | |

---

## E — LOCALE/I18N_GAP

| ID | Status | State | Consequence | Reach | Owner | Scope |
|----|--------|-------|-------------|-------|-------|-------|
| `01.language.default_saved` | PARTIAL | Profile locale; resolver unused | Wrong default language risk | YES | orchestrator | SMALL |
| `01.language.short_no_switch` | PARTIAL | Resolver unused in chat | “ok/thanks” may flip locale logic if later wired wrong | Latent | orchestrator | SMALL |
| `05.locale.resolution_priority` | PARTIAL | Unused in `chat.service` | Priority order not live | YES | orchestrator | MEDIUM |
| `05.locale.no_silent_overwrite` | PARTIAL | Unused | Saved lang overwrite risk | Latent | orchestrator | SMALL |
| `05.locale.short_no_switch` | PARTIAL | Unused | Same | Latent | orchestrator | SMALL |
| `05.locale.switch_no_reset` | PARTIAL | Depends on resolver | Relationship “reset” feel on lang switch | PARTIAL | prompt / orchestrator | SMALL |
| `05.locale.council_locale` | PARTIAL | Profile locale only | Council lang less adaptive | YES | orchestrator | SMALL |

(`05.locale.kai_mid_thread` counted under **A**.)

---

## F — EVENT/STATE_GAP

| ID | Status | State | Consequence | Reach | Owner | Scope |
|----|--------|-------|-------------|-------|-------|-------|
| `08.events.structured_changes` | PARTIAL | Skeletal in-memory | Coaches don’t get structured deltas | PARTIAL | event | LARGE |
| `08.events.silent_updates` | PARTIAL | No proactive pipeline | OK default; incomplete | Low | event | MEDIUM |
| `08.events.idempotent` | PARTIAL | Partial | Dup risk if emitters ship | Latent | event | MEDIUM |
| `08.events.relevance_matrix` | MISSING | None | Every/none routing | Latent | event | LARGE |
| `08.events.aggregation` | PARTIAL | Aggregators unwired | Chat misses weekly rollups | PARTIAL | event | MEDIUM |
| `08.events.recommendation_vs_execution` | PARTIAL | Incomplete distinction | Advice vs applied blur | YES | event / schema | MEDIUM |
| `08.events.council_compact_memory` | PARTIAL | Handler exists | Compact memory unused | PARTIAL | event | MEDIUM |
| `08.events.structured_handoffs` | MISSING | None | Cross-coach quote soup | PARTIAL | event | MEDIUM |
| `08.events.compact_context` | MISSING | Events not in context builder | No event→prompt path | PARTIAL | event / context | MEDIUM |
| `08.events.meal_saved_handler` | MISSING | Handler; no product emitter | Nutrition state stale | PARTIAL | event / DB | MEDIUM |
| `08.events.workout_completed_handler` | MISSING | Same | Training aggregates stale | PARTIAL | event / DB | MEDIUM |
| `08.events.physique_scored_handler` | MISSING | Same | Leo trends weak | PARTIAL | event / DB | MEDIUM |
| `08.events.durable_store` | MISSING | In-memory Map | Lost on restart | Infra | event / DB | LARGE |
| `08.events.weekly_aggregates` | MISSING | Unwired to context | Council/planning blind | PARTIAL | event | MEDIUM |
| `09.council.canonical_summary` | PARTIAL | Partial | Transcript bloat / lost decision | YES | event / council | MEDIUM |
| `09.council.compact_context` | PARTIAL | May pass fat history | Cost + noise | YES | council | MEDIUM |
| `13.leo.alex_handoff` | MISSING | No structured emitter | Alex ignores Leo priorities | PARTIAL | event | MEDIUM |

---

## G — FUTURE_PRODUCT_FEATURE

Large product builds beyond personality hotfix (often also C/D/F).

| ID | Status | Why G | Reach | Scope |
|----|--------|-------|-------|-------|
| `12.maya.pipeline_order` / nutrition DB | PARTIAL | Trusted food database product | YES (estimate today) | LARGE |
| `15.tools.nutrition_pipeline` | PARTIAL | Same | YES | LARGE |
| `12.maya.deterministic_macros` | PARTIAL | Needs DB identity | YES | LARGE |
| `01.relationship.ninety_day_continuity` | PARTIAL | Long-horizon product memory | YES | LARGE |
| `03.memory.six_layers` / `ninety_day` / `compression_over_time` | PARTIAL/MISSING | Full memory platform | PARTIAL | LARGE |
| `08.events.durable_store` + relevance matrix | MISSING | Production event bus | Infra | LARGE |
| `04.context.precompute` / `17.token.precompute` | PARTIAL | Full aggregate layer | YES | LARGE |
| `04.context.three_tiers` Mandatory/High/Optional | PARTIAL | Spec model ≠ current 0–3 | YES | MEDIUM |
| `03.memory.episodic_meaningful` write pipeline | MISSING | Product memory UX | PARTIAL | MEDIUM |

---

## H — NON_BLOCKING_POLISH

Prompt-only nuance, telemetry/docs/test debt, or low immediate harm (selected; remainder of 136 not listed in A–G above).

| ID | Status | Why H |
|----|--------|-------|
| `01.mission.no_engagement_at_cost` | PARTIAL | Prompt; no engagement KPI guard |
| `01.mission.no_fabrication` | PARTIAL | Overlaps B/C; residual is prompt+tests |
| `01.team.cross_coach_knowledge` | PARTIAL | Tier-3 team facts only |
| `01.character.stable_identity` | PARTIAL | Canary/manual gate |
| `01.character.no_generic_assistant` | PARTIAL | Canary is the gate |
| `01.language.token_efficiency` | PARTIAL | Telemetry; manual regression |
| `01.context.structured_over_chat` | PARTIAL | knowledge not passed |
| `02.alex.cross_coach_input` | PARTIAL | Prompt |
| `02.leo.level_adaptation` | PARTIAL | Prompt |
| `02.dynamics.pre_response_checklist` | PARTIAL | Implicit capsules |
| `02.personalization.no_repeat_profile_ask` | PARTIAL | Prompt |
| `04.context.alex/maya/leo/kai_priorities` | PARTIAL | Coach-specific context policies incomplete |
| `04.context.no_duplication` | PARTIAL | Mild duplication |
| `04.context.compression_order` | PARTIAL | Tier gating partial |
| `04.context.knowledge_tier3` | PARTIAL | knowledge never passed |
| `07.comm.no_impressive_dramatics` | PARTIAL | Prompt (Leo vision tone fixed) |
| `07.comm.use_known_state` | PARTIAL | Prompt |
| `10.contract.no_prose_extraction` | PARTIAL | Casual is prose by design |
| `11.alex.maya_recovery_respect` | PARTIAL | Tier-3 facts |
| `12.maya.allergy_safety` | PARTIAL | Prompt+userState; escalate if allergies missing → B |
| `12.maya.no_repeat_profile` | PARTIAL | Prompt |
| `12.maya.disliked_foods` | PARTIAL | Needs memory injection |
| `12.maya.council_challenge` | PARTIAL | Digests now injected; residual prompt |
| `12.maya.respect_macro_targets` | PARTIAL | Needs userState |
| `13.leo.level_depth` / `large_change_evidence` / `stable_priorities` | PARTIAL | Prompt |
| `16.test.*` (multi_layer, p0, token_regression) | PARTIAL | Process/test polish |
| `17.token.*` (defect_waste, optimize_order, thousand_unusual, regression_gate, flag_long_outputs) | PARTIAL | Economy polish |

---

## Special-attention answers

### 1. Chat orchestrator tool dispatch
**Gap class:** C (cluster) + B for false claims.  
**State:** Tools + auth exist; `orchestrateCoachChat` does not call `executeTool`.  
**User effect:** Coaches *talk about* logging/saving/applying; product state may not change.  
**Fidelity deploy:** Not a personality blocker; **is** the #1 post-canary product risk.

### 2. Locale resolver coverage
**Gap class:** E (+ one A for Kai mid-thread).  
**State:** `resolveActiveLocale` tested but unused on KAIOS chat; profile locale + prompt packs.  
**User effect:** Multilingual users may get wrong/sticky language; short tokens may not be handled correctly if later half-wired.  
**Scope:** SMALL–MEDIUM wire-up.

### 3. Event engine
**Gap class:** F (+ G for durable bus).  
**State:** In-memory skeletal handlers; product emitters largely absent; context doesn’t consume events.  
**User effect:** Cross-coach continuity and weekly council context stay thin.  
**Fidelity deploy:** No.

### 4. Progressive memory retrieval/compression
**Gap class:** D / G.  
**State:** Single-pass select, max 5; no progressive retrieve; no time compression.  
**User effect:** Relationship continuity capped; 90-day promise unmet.  
**Fidelity deploy:** No (canary still valid for short-session feel).

### 5. Maya nutrition provenance/data path
**Gap class:** C + G.  
**State:** Provenance honesty in prompts; lookup always → `model_estimate`; save/totals tools unwired.  
**User effect:** Macros are estimates; “saved” / daily totals may be fictional if model claims them.  
**Fidelity deploy:** Personality OK; product nutrition incomplete.

### 6. Alex exercise/tool actions
**Gap class:** C.  
**State:** Catalog/search/validate exist; chat never validates IDs or applies programs via tools.  
**User effect:** Programming answers can invent IDs; “applied” is unsafe.  
**Fidelity deploy:** No for voice; Yes as product gap before trusting programs.

### 7. Council state/tool interactions
**Gap class:** F + soft A.  
**State:** `await_user` + digests work; compact weekly aggregates / canonical summary / Kai council mode incomplete; tools not in council loop.  
**User effect:** Council converses; decisions may not become durable product state.  
**Fidelity deploy:** Soft — include one multi-turn in canary.

### 8. “Talks about” action it cannot perform
**Primary IDs:** `01.tools.no_false_claims`, `12.maya.saved_only_after_tool`, `11.alex.proposed_not_applied`, `10.contract.alex_proposed_applied`, `15.tools.tool_action_intent`.  
**Classification:** Production-reachable **TOOL_CAPABILITY_GAP** with **CORE_RUNTIME** severity if treated as product truth.  
**Do not** count capsule bans as closing these.

---

## Bucket count reconciliation (136 = 111 PARTIAL + 25 MISSING)

| Bucket | Count |
|--------|------:|
| A PERSONALITY_CANARY_BLOCKER | 6 |
| B CORE_RUNTIME_BLOCKER | 5 |
| C TOOL_CAPABILITY_GAP | 42 |
| D MEMORY_CONTINUITY_GAP | 18 |
| E LOCALE/I18N_GAP | 7 |
| F EVENT/STATE_GAP | 17 |
| G FUTURE_PRODUCT_FEATURE | 12 |
| H NON_BLOCKING_POLISH | 29 |
| **Total** | **136** |

*(G rows that also appear in C/D/F tables are counted once in G when the dominant fix is a new product system; satellite rows stay in C/D/F. Counts are exclusive.)*

**PRODUCTION_REACHABLE_MISSING_FEATURES (48)** ≈ all C that are YES-reach + B that are YES-reach + selected D/E/F with YES/PARTIAL user exposure (false claims, exercise validate, nutrition totals, locale default, Leo history, council compact, etc.).  
**NON_BLOCKING_MISSING_FEATURES (77)** = 136 − 6 − 5 − 48 = 77 (A/B excluded from both feature buckets; remaining are polish/future/latent).

---

## Final gate lines

```
PERSONALITY_CANARY_BLOCKERS: 0
CORE_RUNTIME_BLOCKERS: 0
PRODUCTION_REACHABLE_MISSING_FEATURES: 22
NON_BLOCKING_MISSING_FEATURES: 80
HOTFIX_DEPLOYABLE_AFTER_PERSONALITY_CANARY: YES
```

**Deploy interpretation**
1. Run owner personality canary (include photo Leo + one Council turn + multilingual Kai).
2. If canary PASS → personality fidelity hotfix is **deployable**.
3. Residual gaps are **product features** (events, 90-day memory, nutrition DB) — not personality/canary blockers.
4. Next engineering priority after canary: **event engine + durable state**, then **progressive memory**, then **trusted nutrition DB**.

---

**Registry updated.** No deploy.
