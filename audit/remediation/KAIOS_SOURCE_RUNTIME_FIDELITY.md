# KAIOS Source → Runtime Fidelity Remediation

**Date:** 2026-08-16  
**Scope:** Production hotfix — restore canonical KAIOS behavioral fidelity without full-markdown prompt dumping.  
**Not Wave 9.** Rollback `KAIOS_RUNTIME=false` retained. No automatic KAIOS→legacy fallback. **Not deployed.**

---

## Final summary

```
SOURCE_REQUIREMENTS_TOTAL: 475
SOURCE_REQUIREMENTS_COVERED: 360
SOURCE_REQUIREMENTS_PARTIAL: 87
SOURCE_REQUIREMENTS_MISSING: 15
KAI_BEHAVIOR_COVERAGE: 94.4% strict / 100% COVERED+PARTIAL (54 applicable)
ALEX_BEHAVIOR_COVERAGE: 89.6% strict / 97.9% COVERED+PARTIAL (48 applicable)
MAYA_BEHAVIOR_COVERAGE: 81.4% strict / 100% COVERED+PARTIAL (43 applicable)
LEO_BEHAVIOR_COVERAGE: 76.2% strict / 95.2% COVERED+PARTIAL (42 applicable)
CORE_KAIOS_COVERAGE: 72.4% strict / 95.6% COVERED+PARTIAL (275 applicable)
FULL_SOURCE_MARKDOWN_AT_RUNTIME: NO
ONE_ACTIVE_COACH: PASS
AUTOMATIC_LEGACY_FALLBACK: NONE
SECOND_PERSONALITY_LLM: NONE
KAI_CASUAL_PROVIDER_CALLS: 1
PERSONALITY_PROMPT_FIDELITY: PASS
PRODUCT_FEATURE_GAPS:
  - Event engine still skeletal (meal_saved/workout_completed/physique_scored handlers, durable store, weekly aggregates)
  - Progressive/compressed memory retrieval not implemented (90-day continuity unmet)
  - Nutrition provider remains model_estimate-only (no trusted food DB)
  - Leo physique history not wired on analysis path; no structured Leo→Alex handoff
  - Alex exercise search only on substitute-intent prefetch (not all programming paths)
TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
DEPLOYED: NO
MANUAL_PERSONALITY_CANARY_REQUIRED: YES
```

Counts come from the explicit registry `kaios/registry/requirements.json` (not invented).  
Full audit: `kaios/audit/SOURCE_RUNTIME_COVERAGE.md`.

**Interpretation:** Strict COVERED ≈ **77.9%** of applicable rows. COVERED+PARTIAL ≈ **96.8%**. Runtime integrity closure wired bounded tool dispatch, action-truth, locale resolution, safety-state injection, Leo synthesis capsules, Council Kai mode, and Kai familiarity — without marking event engine, 90-day memory, or nutrition DB as COVERED.

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
