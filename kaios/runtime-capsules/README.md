# KAIOS Runtime Capsules

Design-time behavioral specifications live in `kaios/source/*.md` (01–17). Those markdown files are **authoritative for product intent** but are **never parsed or concatenated at request time**.

## Compiled representation

Runtime behavior is encoded as version-controlled TypeScript capsules under:

```
lib/kaios/capsules/
  core.ts, safety.ts, localization.ts   # shared layers
  alex/index.ts, maya/index.ts, leo/index.ts, kai/index.ts, council/index.ts
```

The runtime compiler (`lib/kaios/compiler/prompt.ts`) assembles prompts from:

1. `SAFETY_CAPSULE` (always)
2. `CORE_CAPSULE` (always)
3. Active coach task capsules via `selectActiveCapsules(coach, intent)`
4. `LOCALIZATION_CAPSULE` + one `getLocalePack(locale)`

Council team chat (`lib/kaios/council/turns.ts`) injects `COUNCIL_CORE` directly rather than the full compiler path.

## Traceability

Compact JSON snapshots in this directory list capsule layer keys and their `kaios/source` section references:

| Snapshot | Capsule module | Source spec |
|----------|----------------|-------------|
| `kai.json` | `lib/kaios/capsules/kai/index.ts` | `14_kai.md` |
| `alex.json` | `lib/kaios/capsules/alex/index.ts` | `11_alex.md` |
| `maya.json` | `lib/kaios/capsules/maya/index.ts` | `12_maya.md` |
| `leo.json` | `lib/kaios/capsules/leo/index.ts` | `13_leo.md` |
| `council.json` | `lib/kaios/capsules/council/index.ts` | `09_coach_council.md` |

## Requirement registry

Explicit source→runtime coverage tracking: `kaios/registry/requirements.json`.

Regenerate after capsule or spec changes:

```bash
node scripts/kaios-registry/build.mjs
```

## Verification

- `tests/kaios/no-full-spec-runtime.test.ts` — no `kaios/source` imports under `lib/kaios/`
- `tests/kaios/capsules.test.ts` — capsule size and content guards
- `tests/kaios/runtime-prompt-matrix.test.ts` — coach × intent capsule selection
