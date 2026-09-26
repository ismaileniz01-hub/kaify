import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REGISTRY_PATH = join(
  process.cwd(),
  "kaios/registry/requirements.json",
);

const ALLOWED_STATUS = new Set([
  "COVERED",
  "PARTIAL",
  "MISSING",
  "NOT_APPLICABLE_WITH_REASON",
]);

const ALLOWED_ENFORCEMENT = new Set([
  "CODE",
  "DOCUMENTATION_ONLY",
  "PROMPT_ALWAYS",
  "PROMPT_CONDITIONAL",
  "SAFETY",
  "SCHEMA",
  "STATE_MACHINE",
  "TOOL",
]);

/** Canonical source files 01–17 from kaios/source. */
const REQUIRED_SOURCE_FILES = [
  "01_constitution.md",
  "02_core_identity.md",
  "03_memory_engine.md",
  "04_context_engine.md",
  "05_localization.md",
  "06_safety.md",
  "07_communication.md",
  "08_event_engine.md",
  "09_coach_council.md",
  "10_output_contracts.md",
  "11_alex.md",
  "12_maya.md",
  "13_leo.md",
  "14_kai.md",
  "15_tools_and_vision.md",
  "16_testing_and_release.md",
  "17_token_economy.md",
];

type RequirementRow = {
  id: string;
  source_file: string;
  requirement: string;
  enforcement_type: string;
  status: string;
  runtime_implementation: string;
  notes?: string;
};

type Registry = {
  summary: {
    total: number;
    covered: number;
    partial: number;
    missing: number;
    not_applicable: number;
  };
  requirements: RequirementRow[];
};

function loadRegistry(): Registry {
  expect(existsSync(REGISTRY_PATH), "kaios/registry/requirements.json").toBe(
    true,
  );
  const raw = readFileSync(REGISTRY_PATH, "utf8");
  const parsed = JSON.parse(raw) as Registry;
  expect(parsed.requirements?.length ?? 0, "requirements array").toBeGreaterThan(
    0,
  );
  return parsed;
}

describe("KAIOS source coverage registry", () => {
  it("registry exists with valid rows and source file coverage", () => {
    const registry = loadRegistry();
    const ids = new Set<string>();
    const sourceFiles = new Set<string>();

    for (const row of registry.requirements) {
      expect(row.id, "id").toBeTruthy();
      expect(row.source_file, `${row.id} source_file`).toBeTruthy();
      expect(row.requirement, `${row.id} requirement`).toBeTruthy();
      expect(row.enforcement_type, `${row.id} enforcement_type`).toBeTruthy();
      expect(row.status, `${row.id} status`).toBeTruthy();
      expect(
        row.runtime_implementation,
        `${row.id} runtime_implementation`,
      ).toBeTruthy();

      expect(ALLOWED_STATUS.has(row.status), `${row.id} status`).toBe(true);
      expect(
        ALLOWED_ENFORCEMENT.has(row.enforcement_type),
        `${row.id} enforcement_type`,
      ).toBe(true);

      expect(ids.has(row.id), `duplicate id ${row.id}`).toBe(false);
      ids.add(row.id);
      sourceFiles.add(row.source_file);
    }

    for (const file of REQUIRED_SOURCE_FILES) {
      expect(sourceFiles.has(file), `missing source file ${file}`).toBe(true);
    }

    const { summary, requirements } = registry;
    expect(summary.total).toBe(requirements.length);
    expect(summary.covered).toBe(
      requirements.filter((r) => r.status === "COVERED").length,
    );
    expect(summary.partial).toBe(
      requirements.filter((r) => r.status === "PARTIAL").length,
    );
    expect(summary.missing).toBe(
      requirements.filter((r) => r.status === "MISSING").length,
    );
    expect(summary.not_applicable).toBe(
      requirements.filter((r) => r.status === "NOT_APPLICABLE_WITH_REASON")
        .length,
    );
  });
});
