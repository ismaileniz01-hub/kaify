import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("marketing static rendering (PERF-004)", () => {
  it("root layout metadata does not read cookies or headers", () => {
    const layout = src("app/layout.tsx");
    expect(layout).not.toContain("cookies(");
    expect(layout).not.toContain("headers(");
    expect(layout).toContain("export const metadata");
  });

  it("marketing layout is statically generated without request APIs", () => {
    const layout = src("app/(marketing)/layout.tsx");
    expect(layout).toContain('dynamic = "force-static"');
    expect(layout).not.toContain("headers(");
    expect(layout).not.toContain("cookies(");
  });

  it("public legal pages do not call cookies()", () => {
    expect(src("app/(marketing)/privacy/page.tsx")).not.toContain("cookies(");
    expect(src("app/(marketing)/terms/page.tsx")).not.toContain("cookies(");
    expect(src("app/(marketing)/cookies/page.tsx")).not.toContain("cookies(");
  });
});
