import { describe, expect, it } from "vitest";
import { BACKUP_MANIFEST_TABLES } from "@/lib/services/backup-verification.service";

describe("backup verification", () => {
  it("manifest includes critical tables", () => {
    expect(BACKUP_MANIFEST_TABLES).toContain("profiles");
    expect(BACKUP_MANIFEST_TABLES).toContain("gem_ledger");
    expect(BACKUP_MANIFEST_TABLES.length).toBeGreaterThanOrEqual(5);
  });
});

describe("disaster recovery docs", () => {
  it("DR runbook exists with restore procedures", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const content = readFileSync(
      join(process.cwd(), "docs/operations/disaster-recovery.md"),
      "utf8",
    );
    expect(content).toContain("RPO");
    expect(content).toContain("RTO");
    expect(content).toContain("Restore");
    expect(content).toContain("backup_verification_runs");
  });
});
