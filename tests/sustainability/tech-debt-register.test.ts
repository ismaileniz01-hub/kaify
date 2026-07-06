import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REGISTER = join(
  process.cwd(),
  "docs/sustainability/tech-debt-register.md",
);

describe("tech debt register", () => {
  const content = readFileSync(REGISTER, "utf8");

  it("exists with required sections", () => {
    expect(content).toContain("# Tech Debt Register");
    expect(content).toContain("Review cadence");
    expect(content).toContain("Review log");
  });

  it("has at least one tracked item with ID format", () => {
    expect(content).toMatch(/TD-\d{3}/);
  });

  it("links to ADR 018 process", () => {
    expect(content).toContain("018-tech-debt-process");
  });
});

describe("CONTRIBUTING.md", () => {
  const content = readFileSync(join(process.cwd(), "CONTRIBUTING.md"), "utf8");

  it("references onboarding and CI gate", () => {
    expect(content).toContain("developer-onboarding");
    expect(content).toContain("npm run ci");
  });
});
