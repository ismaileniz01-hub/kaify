# KAIOS — Kaify AI Operating System

KAIOS separates **design-time source** from **runtime capsules**.

## Source vs runtime

| Layer | Path | Role |
| --- | --- | --- |
| **Source** | `kaios/source/` | Full module specs used at design time. Documentation and architecture only. |
| **Runtime** | `lib/kaios/capsules/` | Concise YAML-like TypeScript constants compiled into prompts. |

**Source `.md` files are NOT runtime prompts.** Never concatenate full KAIOS markdown into model context. Runtime must load only capsules and structured context packs.

## Rules

1. Capsules stay high-signal and short (roughly under ~2500 characters each).
2. Canonical user/state data is injected as DATA, not as instructions.
3. Nutrition fallbacks use `model_estimate` provenance only — never invent a trusted food DB.
4. One active coach voice per turn (except Council, which has its own speaker economy).

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
