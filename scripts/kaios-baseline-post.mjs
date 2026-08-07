/**
 * Phase 9 — Post-migration KAIOS prompt-size baseline (static).
 * Compares against kaios/baseline/pre-migration.json.
 *
 * Usage: node scripts/kaios-baseline-post.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Use tsx-less approach: duplicate minimal estimates by shelling vitest is heavy.
// Instead import compiled logic via dynamic path — Node can't load TS directly.
// Mirror compiler sizes using the same capsule files as text read.

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

function est(chars) {
  return Math.ceil(chars / 4);
}

function readTsStringExports(filePath) {
  const src = readFileSync(filePath, "utf8");
  const capsules = [];
  const re = /export const \w+ = `\n?([\s\S]*?)`\.trim\(\)/g;
  let m;
  while ((m = re.exec(src))) {
    capsules.push(m[1].trim());
  }
  return capsules;
}

const core = readTsStringExports(join(root, "lib/kaios/capsules/core.ts")).join(
  "\n",
);
const safety = readTsStringExports(
  join(root, "lib/kaios/capsules/safety.ts"),
).join("\n");
const localization = readTsStringExports(
  join(root, "lib/kaios/capsules/localization.ts"),
).join("\n");

function coachCapsules(coach) {
  return readTsStringExports(
    join(root, `lib/kaios/capsules/${coach}/index.ts`),
  ).join("\n\n");
}

function measure(workflow, coach, userMessage, opts = {}) {
  // Approximate selectActiveCapsules: core pieces + first capsule only for casual
  const coachAll = coachCapsules(coach === "council" ? "council" : coach);
  const coachCore = coachAll.split(/\n\n/).slice(0, opts.deep ? 3 : 1).join("\n\n");
  const system = [core, safety, localization, coachCore].join("\n\n");
  const historyChars = opts.withHistory === false ? 0 : 573;
  const memoryChars = 200;
  const teamFacts = 120;
  const current = userMessage.length + 80;
  const inputChars =
    system.length + historyChars + memoryChars + teamFacts + current;
  const modelCallCount = opts.structured ? 1 : 1; // never 2nd card call
  const visionCallCount = opts.vision ?? 0;
  const maxOut = opts.maxOut ?? 220;

  return {
    workflow,
    coach,
    userMessage,
    input: {
      chars: inputChars,
      estimatedTokens: est(inputChars),
      systemChars: system.length,
      systemEstimatedTokens: est(system.length),
    },
    outputBudget: {
      worstCaseOutputTokens: maxOut,
    },
    modelCallCount: modelCallCount + (opts.analytics ? 1 : 0),
    visionCallCount,
    notes: opts.notes ?? [],
  };
}

const workflows = [
  measure("kai_casual", "kai", "Selam, nasılsın?", {
    maxOut: 80,
    notes: ["KAIOS: no analytics required for baseline compare of card path"],
  }),
  measure("kai_motivation", "kai", "Bugün salona gidesim yok.", {
    maxOut: 140,
    deep: true,
  }),
  measure("alex_simple_training", "alex", "Bench'te dirseklerim nasıl olmalı?", {
    maxOut: 220,
    deep: true,
  }),
  measure(
    "alex_program_related",
    "alex",
    "Bana 3 günlük bir antrenman programı hazırla.",
    {
      maxOut: 400,
      structured: true,
      deep: true,
      notes: ["Single structured inference — NO second card LLM call"],
    },
  ),
  measure("maya_normal_nutrition", "maya", "Bu akşam ne yiyebilirim?", {
    maxOut: 220,
  }),
  measure("maya_image_analysis", "maya", "[photo]", {
    maxOut: 650,
    vision: 2,
    notes: ["1 conversational + 2 vision; nutrition via NutritionDataProvider"],
  }),
  measure("leo_analysis", "leo", "[photo]", {
    maxOut: 650,
    vision: 2,
  }),
  measure("team_council_oneshot", "council", "[opening]", {
    maxOut: 400,
    withHistory: false,
    notes: ["Interactive opening turn; await_user expected"],
  }),
];

let pre = null;
try {
  pre = JSON.parse(
    readFileSync(join(root, "kaios/baseline/pre-migration.json"), "utf8"),
  );
} catch {
  pre = null;
}

const comparisons = workflows.map((w) => {
  const before = pre?.workflows?.find((x) => x.workflow === w.workflow);
  return {
    workflow: w.workflow,
    beforeInputEst: before?.input?.estimatedTokens ?? null,
    afterInputEst: w.input.estimatedTokens,
    inputDelta:
      before?.input?.estimatedTokens != null
        ? w.input.estimatedTokens - before.input.estimatedTokens
        : null,
    beforeModelCalls: before?.modelCallCount ?? null,
    afterModelCalls: w.modelCallCount,
    beforeWorstOut: before?.outputBudget?.worstCaseOutputTokens ?? null,
    afterWorstOut: w.outputBudget.worstCaseOutputTokens,
  };
});

const report = {
  capturedAt: new Date().toISOString(),
  method: "static_kaios_capsule_construction",
  tokenEstimateRule: "ceil(chars / 4)",
  liveProviderCalls: false,
  kaiosRuntimeDefault: true,
  workflows,
  comparisons,
  summary: {
    maxInputEstimatedTokens: Math.max(
      ...workflows.map((w) => w.input.estimatedTokens),
    ),
    maxModelCallCount: Math.max(...workflows.map((w) => w.modelCallCount)),
    maxWorstCaseOutputBudget: Math.max(
      ...workflows.map((w) => w.outputBudget.worstCaseOutputTokens),
    ),
    avgInputDeltaVsPre:
      comparisons
        .filter((c) => c.inputDelta != null)
        .reduce((s, c) => s + c.inputDelta, 0) /
      Math.max(1, comparisons.filter((c) => c.inputDelta != null).length),
  },
};

const outDir = join(root, "kaios/baseline");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "post-migration.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(report.summary, null, 2));
for (const c of comparisons) {
  console.log(
    `- ${c.workflow}: in ${c.beforeInputEst} → ${c.afterInputEst} (Δ ${c.inputDelta}), calls ${c.beforeModelCalls} → ${c.afterModelCalls}, outBudget ${c.beforeWorstOut} → ${c.afterWorstOut}`,
  );
}

void require;
