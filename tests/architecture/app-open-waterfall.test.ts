import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { alreadyCheckedInOnLocalDay } from "@/lib/check-in-gate";

describe("app-open waterfall (PERF-003)", () => {
  const sessionSrc = readFileSync(join(process.cwd(), "lib/session-context.tsx"), "utf8");

  it("does not POST check-in when the local day is already checked in", () => {
    expect(sessionSrc).toContain("alreadyCheckedInOnLocalDay");
    expect(sessionSrc).toContain("hasBrowserAuthCookie");
    expect(alreadyCheckedInOnLocalDay("2099-01-01", "UTC")).toBe(false);
  });

  it("skips /api/session bootstrap without an auth cookie", () => {
    expect(sessionSrc).toMatch(/hasBrowserAuthCookie\(\)[\s\S]*refreshSession/);
    expect(sessionSrc).toContain("applyGuestState()");
  });

  it("session bundle already includes home so open does not require /api/home", () => {
    const svc = readFileSync(join(process.cwd(), "lib/services/session.service.ts"), "utf8");
    expect(svc).toContain("home:");
    expect(sessionSrc).toContain("setHome(bundle.home)");
  });
});
