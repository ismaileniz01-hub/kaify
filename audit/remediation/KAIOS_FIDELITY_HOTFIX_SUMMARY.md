# KAIOS Source → Runtime Fidelity Hotfix — Summary

**Date:** 2026-08-16  
**Commit:** `792300b`  
**Branch:** `cursor/signup-onboarding-lifestyle-fields`  
**Deployed:** NO  
**Manual personality canary:** REQUIRED before any deploy

---

## Problem

Canonical KAIOS specs live under `kaios/source/01–17`, but production was sending ultra-thin YAML capsules. Architecture tests passed; coach personality/behavior fidelity did not.

## What we did

1. **Audited** all 17 source specs into an explicit requirement registry (`kaios/registry/requirements.json`).
2. **Rebuilt** layered coach capsules (identity / voice / relationship / rules / boundaries / style / forbidden + conditional modes) without loading full markdown at runtime.
3. **Restored** Kai, Alex, Maya, Leo, and Council behavioral contracts in runtime prompts.
4. **Fixed** casual tier continuity (greetings stay lean; contextual cues keep history/memory).
5. **Replaced** rigid “1–3 sentences” with output budgets by conversational need.
6. **Fixed** Leo’s hype tone in `lib/ai/personas.ts` to composed/observational.
7. **Added** fidelity + source-coverage regression tests.

## Coverage (explicit counts)

| Metric | Count |
|--------|------:|
| Total requirements | 475 |
| COVERED | 326 |
| PARTIAL | 111 |
| MISSING | 25 |
| N/A | 13 |
| Applicable | 462 |
| Strict COVERED | **70.6%** |
| COVERED + PARTIAL | **94.6%** |

| Area | Strict | COVERED+PARTIAL |
|------|-------:|----------------:|
| Kai | 90% | 100% |
| Alex | 86.4% | 93.2% |
| Maya | 71.8% | 94.9% |
| Leo | 71.1% | 94.7% |
| Core KAIOS | 64.6% | 93.8% |

## Guards still in place

- Full source markdown **not** sent at runtime
- One active coach per normal turn
- No automatic KAIOS → legacy fallback
- `KAIOS_RUNTIME=false` rollback retained
- No second personality LLM
- Kai casual = 1 provider call

## Remaining product gaps (not personality text)

- Most tools still not called from chat orchestrator
- Nutrition still `model_estimate` only
- Event engine still skeletal
- Progressive memory compression/retrieval incomplete
- Locale resolver not fully wired on every KAIOS path

## Gates

| Gate | Result |
|------|--------|
| Tests | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |
| Deployed | **NO** |

## Owner next step

Run the **manual personality canary** (Kai 10–15, Alex/Maya 5–10 each, Leo flows, one Council multi-turn). Judge identity, naturalness, humor, continuity, verbosity, language, safety, non-genericness.

Do **not** deploy until canary PASS.

## Key files

- Full report: `audit/remediation/KAIOS_SOURCE_RUNTIME_FIDELITY.md`
- Coverage audit: `kaios/audit/SOURCE_RUNTIME_COVERAGE.md`
- Prompt sizes: `kaios/audit/prompt-size-snapshot.json`
- Registry: `kaios/registry/requirements.json`
- Capsules: `lib/kaios/capsules/{kai,alex,maya,leo,council}/`
- Scenarios: `kaios/fixtures/personality/scenarios.json`
