import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * scripts/ops/check-migration-history.sh parses `supabase migration list`.
 * The first production run (2026-11-27) printed a markdown table with
 * backtick-wrapped versions, which the parser rejected; these cases pin the
 * real formats and the fail-closed behaviour.
 */
const script = join(process.cwd(), "scripts/ops/check-migration-history.sh");
const dir = mkdtempSync(join(tmpdir(), "mig-history-"));
const run = (name: string, text: string, mode: "strict" | "allow-pending") => {
  const file = join(dir, `${name}.txt`);
  writeFileSync(file, text);
  const r = spawnSync("bash", [script, file, mode], { encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const header = "   Local            | Remote           | Time (UTC)\n  ------------------|------------------|-----------------------\n";

describe("check-migration-history.sh", () => {
  it("reads the backtick markdown table the Supabase CLI prints in CI", () => {
    const text =
      header +
      "   `20260630120000` | `20260630120000` | `2026-06-30 12:00:00` \n" +
      "   `20261126120000` | ` `              | `2026-11-26 12:00:00` \n";
    expect(run("bt-strict", text, "strict").code).toBe(1);
    const pending = run("bt-pending", text, "allow-pending");
    expect(pending.code).toBe(0);
    expect(pending.out).toContain("pending: 20261126120000");
  });

  it("always refuses versions applied in production but missing from the repo", () => {
    const text = header + "   ` `              | `20260806090525` | `2026-08-06 09:05:25` \n";
    const r = run("remote-only", text, "allow-pending");
    expect(r.code).toBe(1);
    expect(r.out).toContain("20260806090525");
  });

  it("passes when both histories match (plain and box-drawing tables)", () => {
    expect(run("plain", header + "   20260101000000 | 20260101000000 | 2026-01-01\n", "strict").code).toBe(0);
    expect(run("box", "   20260101000000 │ 20260101000000 │ 2026-01-01\n", "strict").code).toBe(0);
  });

  it("fails closed when no version can be parsed", () => {
    const r = run("garbage", "some new CLI format\n20260101000000 20260101000000\n", "allow-pending");
    expect(r.code).toBe(1);
    expect(r.out).toContain("Could not parse");
  });
});
