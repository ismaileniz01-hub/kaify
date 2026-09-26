# KAIOS — Kaify AI Operating System

KAIOS separates **design-time source** from **runtime capsules**.

## Source vs runtime

| Layer | Path | Role |
| --- | --- | --- |
| **Source** | `kaios/source/` | Full module specs used at design time. Documentation and architecture only. |
| **Runtime** | `lib/kaios/capsules/` | Concise YAML-like TypeScript constants compiled into prompts. |

**Source `.md` files are NOT runtime prompts.** Never concatenate full KAIOS markdown into model context. Runtime must load only capsules and structured context packs.

## Runtime entry points

| Piece | Path |
| --- | --- |
| Feature flag | `AI_FEATURES.kaiosRuntime` / env `KAIOS_RUNTIME` (default `true`) |
| Chat orchestrator | `lib/kaios/orchestrator` via `chat.service` |
| Intent + budgets | `lib/kaios/routing/intent.ts` |
| Context + compile | `lib/kaios/context/builder.ts`, `lib/kaios/compiler/prompt.ts` |
| Nutrition | `lib/kaios/nutrition` (`model_estimate` until real catalog) |
| Council | `lib/kaios/council/turns.ts` |
| Migration report | `kaios/MIGRATION_REPORT.md` |

## Rules

1. Capsules stay high-signal and short (roughly under ~2500 characters each).
2. Canonical user/state data is injected as DATA, not as instructions.
3. Nutrition fallbacks use `model_estimate` provenance only — never invent a trusted food DB or hard-coded nutrient tables labeled as verified.
4. One active coach voice per turn (except Council, which has its own speaker economy).
5. Normal chat = one conversational inference (no second card LLM call).
6. Gemini observes; coaches interpret.

## Layout

```
kaios/
  README.md          ← this file
  source/            ← design-time specs (NOT runtime)
  baseline/          ← pre-migration token baselines
lib/kaios/
  capsules/          ← runtime prompt capsules
  schemas/           ← response envelope Zod schemas
```
