# KAIOS Source → Runtime Fidelity Remediation

**Date:** 2026-08-16  
**Scope:** Production hotfix — restore canonical KAIOS behavioral fidelity without full-markdown prompt dumping.  
**Not Wave 9.** Rollback `KAIOS_RUNTIME=false` retained. No automatic KAIOS→legacy fallback. **Not deployed.**

---

## Final summary

```
SOURCE_REQUIREMENTS_TOTAL: 475
SOURCE_REQUIREMENTS_COVERED: 326
SOURCE_REQUIREMENTS_PARTIAL: 111
SOURCE_REQUIREMENTS_MISSING: 25
KAI_BEHAVIOR_COVERAGE: 90% strict / 100% COVERED+PARTIAL (50 applicable)
ALEX_BEHAVIOR_COVERAGE: 86.4% strict / 93.2% COVERED+PARTIAL (44 applicable)
MAYA_BEHAVIOR_COVERAGE: 71.8% strict / 94.9% COVERED+PARTIAL (39 applicable)
LEO_BEHAVIOR_COVERAGE: 71.1% strict / 94.7% COVERED+PARTIAL (38 applicable)
CORE_KAIOS_COVERAGE: 64.6% strict / 93.8% COVERED+PARTIAL (291 applicable)
FULL_SOURCE_MARKDOWN_AT_RUNTIME: NO
ONE_ACTIVE_COACH: PASS
AUTOMATIC_LEGACY_FALLBACK: NONE
SECOND_PERSONALITY_LLM: NONE
KAI_CASUAL_PROVIDER_CALLS: 1
PERSONALITY_PROMPT_FIDELITY: PASS
PRODUCT_FEATURE_GAPS:
  - Chat orchestrator still does not call most tools (exercise search/validate, save meal, nutrition state, physique history)
  - Nutrition provider remains model_estimate-only (no trusted food DB)
  - Event engine still skeletal (most meal_saved/workout_completed/physique_scored handlers missing)
  - Progressive/compressed memory retrieval not implemented
  - Locale resolver not fully wired on all KAIOS chat paths
  - Cross-coach structured Leo→Alex handoff incomplete
TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
DEPLOYED: NO
MANUAL_PERSONALITY_CANARY_REQUIRED: YES
```

Counts come from the explicit registry `kaios/registry/requirements.json` (not invented).  
Full audit: `kaios/audit/SOURCE_RUNTIME_COVERAGE.md`.

**Interpretation:** Strict COVERED ≈ **70.6%** of applicable rows. COVERED+PARTIAL ≈ **94.6%**. Many MODEL_BEHAVIOR rows are now enforced via layered prompt capsules; remaining MISSING rows are mostly APPLICATION_BEHAVIOR (tools/events/DB).

---

## What changed

### Capsule architecture
- Replaced ultra-thin coach blobs with layered always-on capsules:
  - Identity / Voice / Relationship (Kai) / Behavior / Boundaries / Response style / Forbidden
  - Conditional modes: casual, motivation, health, memory, form, programming, food photo, scoring, trend, council digests
- Build-time/versioned snapshots under `kaios/runtime-capsules/*.json`
- Source remains `kaios/source/01–17`; runtime never loads full markdown

### Fidelity restores
- **Kai:** full character contract (warm/playful/loyal/direct; laziness vs illness; casual talk; memory honesty)
- **Alex:** science-based programming/form/safety/motivation nuance
- **Maya:** warm analytical; model_estimate honesty; confirm-before-save language
- **Leo:** composed/observational (fixed hype tone in `lib/ai/personas.ts` ANALYSIS_PERSONAS + chat voice)
- **Council:** bounded `COUNCIL_ROLE_DIGESTS` in capsules + `runCouncilTurn`

### Continuity & budgets
- Casual tier 0 only for greeting-like messages
- Continuity cues (`yine`, `boktan`, `hatırlıyor musun`, etc.) keep history/memory (0–5)
- Output budgets by conversational need (micro/casual/support/memory/detailed) — not universal 1–3 sentences

### Regression guards
- `kaios/registry/requirements.json` + `tests/kaios/fidelity/source-coverage-registry.test.ts`
- Personality prompt contracts + `kaios/fixtures/personality/scenarios.json`
- Prompt size snapshot: `kaios/audit/prompt-size-snapshot.json`

---

## Prompt size snapshot (est. tokens)

| Scenario | SYSTEM | COACH CAPSULES | MEMORY | HISTORY | TOTAL | maxOut |
|----------|-------:|---------------:|-------:|--------:|------:|-------:|
| Kai casual | 1576 | 878 | 0 | 0 | 1640 | 80 |
| Kai contextual | 1576 | 878 | 0 | 6 | 1690 | 120 |
| Kai memory | 1662 | 928 | 8 | 0 | 1735 | 180 |
| Alex form | 1151 | 454 | 0 | 0 | 1222 | 400 |
| Alex program | 1211 | 514 | 0 | 0 | 1283 | 400 |
| Maya text | 1180 | 483 | 0 | 0 | 1251 | 400 |
| Maya photo | 1243 | 514 | 0 | 0 | 1312 | 650 |
| Leo | 1102 | 372 | 0 | 0 | 1169 | 650 |
| Council | 929 | 201 | 0 | 0 | 999 | 400 |

Fidelity preferred over artificial thinness. No full 17-file dump.

---

## Manual personality canary (owner)

Evaluate live feel — unit tests cannot prove character:

**Kai (10–15):** greeting; “iyiyim sağol”; laziness; repeated laziness; fever; “sadece konuşalım”; memory recall; slang; self-criticism; TR/EN/DE/AR  
**Alex (5–10):** form; programming; pain; RIR; substitution  
**Maya (5–10):** food guilt; macros; photo ambiguity; model_estimate honesty  
**Leo:** good/poor image; BF% demand; medical-looking concern  
**Council:** one full multi-turn await_user → Team Decision  

Judge: IDENTITY, NATURALNESS, ROLE FIDELITY, HUMOR, CONTEXT, MEMORY, VERBOSITY, LANGUAGE, SAFETY, NON-GENERICNESS.

**Do not deploy until owner canary PASS.**
