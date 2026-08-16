# KAIOS — Multilingual Kai Continuation + Naturalness Hotfix

**Date:** 2026-08-16  
**Scope:** Language-independent short-turn continuation after elliptical replies; multilingual personality parity; provenance + Unicode stream guards.  
**Deployed:** NO  

## Root cause

Short / elliptical user turns (e.g. TR `bilmiyorum`, EN `I don't know`, AR `ما أدري`) were treated as standalone casual when length heuristics dominated. That dropped recent dialogue and allowed help-desk topic-reset phrasing after Kai had just proposed a minimum action.

Defect is **locale-independent**; Turkish was the observed canary surface.

## Architecture (not a phrase dictionary)

1. **`lib/kaios/context/short-turn.ts`** — structural classifier:
   - prior assistant proposal/question
   - elliptical current turn
   - conversational function (HESITATION / AMBIVALENCE / REJECTION / …)
   - `continuePreviousTopic`, `resetConversation`, recent-turn budget 1–3  
   Phrase boosters exist only as high-confidence fixtures.

2. **`lib/kaios/context/builder.ts`** — on continuation: keep 1–3 turns, inject continuation hint, append `+continuation` for Kai capsule selection.

3. **`lib/kaios/routing/intent.ts`** — elliptical-after-proposal → `unknown` (not bare `casual`).

4. **`lib/kaios/capsules/kai/continuation.ts`** — `KAI_MODE_CONTINUATION` + `KAI_MODE_RESISTANCE` (ban topic-reset questions; adapt after resistance).

5. **Locale packs** — anti-reset guidance for en/tr/de/fr/es/es-MX/es-AR/it/ar (+ existing packs).

6. **Provenance** — `gymSkipFacts` emits `canonical: … (source: TRUSTED_ANALYTICS)` only when a workout was logged.

7. **Unicode stream** — `lib/kaios/stream/unicode.ts`; chat.service skips persist on suspicious completion (broken UTF-16 / empty after delta / abort).

## Manual canary sample (owner)

| Locale | Fixture |
|--------|---------|
| TR | Kai: beş dakika → user: `bilmiyorum` |
| EN | Kai: five minutes → user: `I don't know` |
| DE or ES | same ambivalence |
| AR | Kai: خمس دقائق → user: `ما أدري` |
| Switch | TR thread → EN `yeah, I don't know` |

Automated contracts cover all selectable locales in §12 matrix.

## Required result flags

| Flag | Result |
|------|--------|
| KAI_SHORT_TURN_CONTINUITY_ALL_LOCALES | PASS |
| KAI_AMBIVALENCE_HANDLING_ALL_LOCALES | PASS |
| KAI_CONTEXT_RESET_REGRESSION | PASS |
| KAI_PERSONALITY_PARITY | PASS |
| KAI_CODE_SWITCHING | PASS |
| LOCALE_RESOLUTION | PASS |
| SHORT_ACK_NO_FALSE_LANGUAGE_SWITCH | PASS |
| ARABIC_RTL_SEMANTIC_PARITY | PASS |
| PRECISE_STATE_PROVENANCE | PASS |
| HALLUCINATED_PERSONAL_HISTORY | 0 (contract: inventing days/months forbidden; only canonical USER_CONTEXT) |
| UNICODE_STREAM_COMPLETION | PASS |
| KAI_PROVIDER_CALLS | 1 |
| FULL_SOURCE_MARKDOWN_RUNTIME | NO |
| SECOND_PERSONALITY_LLM | NONE |
| TESTS | PASS (kaios suite 387) |
| TYPECHECK | PASS |
| LINT | PASS |
| BUILD | PASS |
| DEPLOYED | NO |

## Prompt inspection (TR / EN / DE / ES / AR)

Same semantic two-turn ambivalence scenario. Expected in all five:

- ACTIVE_COACH: kai  
- RESOLVED_LOCALE: matching fixture locale  
- CONDITIONAL_CAPSULES: includes `kai.mode.continuation` (+ resistance)  
- RECENT_TURNS_INCLUDED: 1–3  
- MEMORIES_INCLUDED: when provided  
- CANONICAL_STATE_INCLUDED: when provided (`TRUSTED_ANALYTICS` label)  
- OUTPUT_BUDGET / ESTIMATED_INPUT_TOKENS: from runtime context  

No locale is stripped of always-on Kai personality layers; packs differ only in expression hints.

## Intentionally unchanged

- Providers / models  
- Tool architecture / allowlists  
- Rollback (`KAIOS_RUNTIME`)  
- No deploy  
