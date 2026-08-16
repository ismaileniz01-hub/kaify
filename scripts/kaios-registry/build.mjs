#!/usr/bin/env node
/** Generates kaios/registry/requirements.json + runtime-capsule snapshots. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_REQUIREMENTS } from "./requirements-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const ids = new Set();
for (const r of ALL_REQUIREMENTS) {
  if (ids.has(r.id)) throw new Error(`Duplicate id: ${r.id}`);
  ids.add(r.id);
}

const summary = {
  total: ALL_REQUIREMENTS.length,
  covered: ALL_REQUIREMENTS.filter((r) => r.status === "COVERED").length,
  partial: ALL_REQUIREMENTS.filter((r) => r.status === "PARTIAL").length,
  missing: ALL_REQUIREMENTS.filter((r) => r.status === "MISSING").length,
  not_applicable: ALL_REQUIREMENTS.filter(
    (r) => r.status === "NOT_APPLICABLE_WITH_REASON",
  ).length,
};

const registry = {
  version: 1,
  generated: "2026-08-16",
  summary,
  requirements: ALL_REQUIREMENTS,
};

mkdirSync(join(ROOT, "kaios/registry"), { recursive: true });
mkdirSync(join(ROOT, "kaios/runtime-capsules"), { recursive: true });

writeFileSync(
  join(ROOT, "kaios/registry/requirements.json"),
  JSON.stringify(registry, null, 2) + "\n",
);

writeFileSync(
  join(ROOT, "kaios/runtime-capsules/README.md"),
  `# KAIOS Runtime Capsules

Design-time behavioral specifications live in \`kaios/source/*.md\` (01–17). Those markdown files are **authoritative for product intent** but are **never parsed or concatenated at request time**.

## Compiled representation

Runtime behavior is encoded as version-controlled TypeScript capsules under:

\`\`\`
lib/kaios/capsules/
  core.ts, safety.ts, localization.ts   # shared layers
  alex/index.ts, maya/index.ts, leo/index.ts, kai/index.ts, council/index.ts
\`\`\`

The runtime compiler (\`lib/kaios/compiler/prompt.ts\`) assembles prompts from:

1. \`SAFETY_CAPSULE\` (always)
2. \`CORE_CAPSULE\` (always)
3. Active coach task capsules via \`selectActiveCapsules(coach, intent)\`
4. \`LOCALIZATION_CAPSULE\` + one \`getLocalePack(locale)\`

Council team chat (\`lib/kaios/council/turns.ts\`) injects \`COUNCIL_CORE\` directly rather than the full compiler path.

## Traceability

Compact JSON snapshots in this directory list capsule layer keys and their \`kaios/source\` section references:

| Snapshot | Capsule module | Source spec |
|----------|----------------|-------------|
| \`kai.json\` | \`lib/kaios/capsules/kai/index.ts\` | \`14_kai.md\` |
| \`alex.json\` | \`lib/kaios/capsules/alex/index.ts\` | \`11_alex.md\` |
| \`maya.json\` | \`lib/kaios/capsules/maya/index.ts\` | \`12_maya.md\` |
| \`leo.json\` | \`lib/kaios/capsules/leo/index.ts\` | \`13_leo.md\` |
| \`council.json\` | \`lib/kaios/capsules/council/index.ts\` | \`09_coach_council.md\` |

## Requirement registry

Explicit source→runtime coverage tracking: \`kaios/registry/requirements.json\`.

Regenerate after capsule or spec changes:

\`\`\`bash
node scripts/kaios-registry/build.mjs
\`\`\`

## Verification

- \`tests/kaios/no-full-spec-runtime.test.ts\` — no \`kaios/source\` imports under \`lib/kaios/\`
- \`tests/kaios/capsules.test.ts\` — capsule size and content guards
- \`tests/kaios/runtime-prompt-matrix.test.ts\` — coach × intent capsule selection
`,
);

const snapshots = {
  kai: {
    source: "14_kai.md",
    module: "lib/kaios/capsules/kai/index.ts",
    always_on: [
      { key: "KAI_IDENTITY", source_section: "Identity & Mission" },
      { key: "KAI_VOICE", source_section: "Character & Voice" },
      { key: "KAI_RELATIONSHIP", source_section: "Relationship & Continuity" },
      { key: "KAI_BEHAVIOR_RULES", source_section: "Motivation Philosophy" },
      { key: "KAI_BOUNDARIES", source_section: "Boundaries & Security" },
      { key: "KAI_RESPONSE_STYLE", source_section: "Output & Runtime" },
      { key: "KAI_FORBIDDEN", source_section: "Quality Gates" },
    ],
    conditional_modes: [
      { key: "KAI_MODE_CASUAL", task: "casual", source_section: "Output & Runtime" },
      { key: "KAI_MODE_MOTIVATION", task: "motivation", source_section: "Motivation Philosophy" },
      { key: "KAI_MODE_HEALTH", task: "health", source_section: "Health vs Excuse Classification" },
      { key: "KAI_MODE_EMOTIONAL", task: "emotional", source_section: "Emotional Intelligence" },
      { key: "KAI_MODE_CELEBRATION", task: "celebration", source_section: "Celebration & Setbacks" },
      { key: "KAI_MODE_MEMORY", task: "memory", source_section: "Memory Use" },
      { key: "KAI_MODE_COUNCIL", task: "council", source_section: "Team Role & Council" },
    ],
    selector: "selectKaiCapsules",
  },
  alex: {
    source: "11_alex.md",
    module: "lib/kaios/capsules/alex/index.ts",
    always_on: [
      { key: "ALEX_IDENTITY", source_section: "Identity & Mission" },
      { key: "ALEX_VOICE", source_section: "Identity & Mission" },
      { key: "ALEX_BEHAVIOR", source_section: "Programming & Progression" },
      { key: "ALEX_BOUNDARIES", source_section: "Output & Runtime" },
      { key: "ALEX_RESPONSE_STYLE", source_section: "Output & Runtime" },
      { key: "ALEX_SAFETY", source_section: "Technique & Safety" },
    ],
    conditional_modes: [
      { key: "ALEX_FORM", task: "form", source_section: "Technique & Safety" },
      { key: "ALEX_PROGRAMMING", task: "programming", source_section: "Programming & Progression" },
      { key: "ALEX_MOTIVATION", task: "motivation", source_section: "Motivation & Cross-Coach" },
    ],
    selector: "selectAlexCapsules",
  },
  maya: {
    source: "12_maya.md",
    module: "lib/kaios/capsules/maya/index.ts",
    always_on: [
      { key: "MAYA_IDENTITY", source_section: "Identity & Mission" },
      { key: "MAYA_VOICE", source_section: "Identity & Mission" },
      { key: "MAYA_BEHAVIOR", source_section: "Meal Tracking Contract" },
      { key: "MAYA_BOUNDARIES", source_section: "Safety & Cross-Coach" },
      { key: "MAYA_RESPONSE_STYLE", source_section: "Output & Runtime" },
      { key: "MAYA_SAFETY", source_section: "Safety & Cross-Coach" },
    ],
    conditional_modes: [
      { key: "MAYA_FOOD_ANALYSIS", task: "food_analysis", source_section: "Meal Analysis Pipeline" },
      { key: "MAYA_MEAL_PLANNING", task: "meal_planning", source_section: "Goal Adaptation & Strategy" },
      { key: "MAYA_HYDRATION", task: "hydration", source_section: "Meal Tracking Contract" },
    ],
    selector: "selectMayaCapsules",
  },
  leo: {
    source: "13_leo.md",
    module: "lib/kaios/capsules/leo/index.ts",
    always_on: [
      { key: "LEO_IDENTITY", source_section: "Identity & Mission" },
      { key: "LEO_VOICE", source_section: "Identity & Mission" },
      { key: "LEO_BEHAVIOR", source_section: "Scoring Methodology" },
      { key: "LEO_BOUNDARIES", source_section: "Posture & Medical Boundaries" },
      { key: "LEO_RESPONSE_STYLE", source_section: "UI Output & Runtime" },
      { key: "LEO_IMAGE_QUALITY", source_section: "Image Quality & Comparison" },
    ],
    conditional_modes: [
      { key: "LEO_SCORING", task: "scoring", source_section: "Scoring Methodology" },
      { key: "LEO_TREND", task: "trend", source_section: "Image Quality & Comparison" },
      { key: "LEO_POSTURE", task: "posture", source_section: "Posture & Medical Boundaries" },
    ],
    selector: "selectLeoCapsules",
    vision_path_note:
      "Photo synthesis uses lib/ai/personas.ts ANALYSIS_PERSONAS.leo (composed tone aligned with LEO_VOICE)",
  },
  council: {
    source: "09_coach_council.md",
    module: "lib/kaios/capsules/council/index.ts",
    layers: [
      { key: "COUNCIL_CORE", source_section: "Meeting Structure" },
      { key: "COUNCIL_ROLE_DIGESTS", source_section: "Discussion & Disagreement" },
    ],
    selector: "selectCouncilCapsules",
    runtime_note:
      "selectCouncilCapsules includes COUNCIL_ROLE_DIGESTS; runCouncilTurn still injects COUNCIL_CORE only",
  },
};

for (const [name, snap] of Object.entries(snapshots)) {
  writeFileSync(
    join(ROOT, `kaios/runtime-capsules/${name}.json`),
    JSON.stringify({ version: 1, generated: "2026-08-16", ...snap }, null, 2) + "\n",
  );
}

console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${ALL_REQUIREMENTS.length} requirements`);
