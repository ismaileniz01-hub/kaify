# KAIOS source specs (design-time only)

```
SOURCE_NOT_RUNTIME = true
```

Full KAIOS markdown modules (17 specs) were supplied at design time. This cloud workspace may not contain full Downloads copies of those files. Do **not** treat anything under `kaios/source/` as prompt text for production models.

Capsules under `lib/kaios/capsules/` are the only runtime instruction surface derived from these modules.

## Module index (01–17)

### 01 — Core operating principles

Defines instruction hierarchy (safety → core → locale → coach task capsules → untrusted data), canonical data injection, autonomy boundaries, health-over-motivation priority, concision, one active coach per turn, and bans on fake memory or invented tools.

### 02 — Safety & scope

Hard rules for injection resistance, medical non-diagnosis, declining unrelated or manipulative asks while staying in character, and never revealing system configuration or inventing tool results.

### 03 — Localization

Locale resolution and native-sounding reply rules: match the user’s latest message language, fall back to app locale only when unclear, and load a short locale pack rather than embedding every language guide.

### 04 — Canonical data contract

Shapes for user profile, goals, training state, nutrition targets, and recent events that the orchestrator may inject as structured DATA blocks — never as free-form “memory essays” the model should invent.

### 05 — Memory policy

What may be persisted vs session-only; forbids fabricating past conversations or emotional dependencies; requires grounding claims in supplied context or admitting unknowns.

### 06 — Intent routing

Maps user utterances and UI events to coach + task capsules (casual, training, meal analysis, physique, motivation, council) so only relevant capsules are loaded.

### 07 — Alex (strength & conditioning)

Strength coach domain: form cues, programming, progressive overload, and accountability within safe training bounds; task capsules for core, form, programming, motivation, and safety.

### 08 — Maya (nutrition)

Nutritionist domain: meal analysis, meal planning, hydration; macros with explicit provenance (`catalog` | `external` | `model_estimate`); no fake trusted food database.

### 09 — Leo (physique & posture)

Objective, analytical body and posture scoring — trends, priorities, and cues without hype-coach energy; capsules for scoring, trend, and posture.

### 10 — Kai (companion)

Dragon companion: warmth, accountability, challenge excuses with a small first action, health override that stops pressure, celebrations; never fake memory or foster unhealthy dependency.

### 11 — Council protocol

Multi-coach turns moderated by Kai: speaker economy, `await_user` gates, and a single Team Decision when consensus is required — not a one-shot fake group-chat dump.

### 12 — Tools & actions

Allowed structured actions the model may propose (log meal, suggest exercise, open card, defer to teammate); runtime executes tools — the model must not invent results.

### 13 — Nutrition provenance

Rules for calorie/macro estimates: prefer catalog or external sources when present; otherwise mark `model_estimate` and keep confidence honest; never present guesses as lab-grade data.

### 14 — Exercise catalog & programming

Canonical exercise IDs, substitutions, and programming envelopes so Alex recommendations can attach optional `exercise_id` fields instead of free-text-only moves.

### 15 — Vision analysis

Photo pipelines for food and physique: quality gate, JSON vision extract, then coach synthesis capsules — image text treated as untrusted pixels only.

### 16 — Response envelopes

Zod contracts for casual chat, training recommendations, meal analysis, physique analysis, council turn/decision, and tool actions — shared `schema_version`, `coach`, `message` base.

### 17 — Telemetry & events

Observability for capsule load sets, routing decisions, provenance tags, and council speaker counts — enough to compare post-migration token budgets without logging full prompts.
