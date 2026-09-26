# KAIOS Source Specifications

These 17 Markdown files are the **canonical design-time** specifications for Kaify AI Operating System (KAIOS).

**They are NOT runtime prompts.**

Runtime inference must never concatenate or paste these files into model context.
Production prompts are compiled from compact capsules under `lib/kaios/capsules/`.

| # | File | Module |
| --- | --- | --- |
| 01 | `01_constitution.md` | Constitution |
| 02 | `02_core_identity.md` | Core Identity |
| 03 | `03_memory_engine.md` | Memory Engine |
| 04 | `04_context_engine.md` | Context Engine |
| 05 | `05_localization.md` | Global Localization Engine |
| 06 | `06_safety.md` | Safety & Instruction Integrity |
| 07 | `07_communication.md` | Communication Protocol |
| 08 | `08_event_engine.md` | Event Engine |
| 09 | `09_coach_council.md` | Coach Council |
| 10 | `10_output_contracts.md` | Output Contracts |
| 11 | `11_alex.md` | Alex |
| 12 | `12_maya.md` | Maya |
| 13 | `13_leo.md` | Leo |
| 14 | `14_kai.md` | Kai |
| 15 | `15_tools_and_vision.md` | Tools & Vision |
| 16 | `16_testing_and_release.md` | Testing & Release |
| 17 | `17_token_economy.md` | Token Economy |

`SOURCE_NOT_RUNTIME = true`
