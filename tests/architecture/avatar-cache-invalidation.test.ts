import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("PERF-007 avatar signed URL invalidation", () => {
  it("upload deletes signed URL keys for common extensions", () => {
    const src = readFileSync(join(process.cwd(), "app/api/profile/avatar/route.ts"), "utf8");
    expect(src).toContain("CacheKeys.avatarSigned");
    expect(src).toContain("cacheDelete");
    expect(src).toContain("avatarObjectPath");
  });

  it("account deletion still purges avatar signed patterns", () => {
    const src = readFileSync(join(process.cwd(), "lib/cache/invalidate.ts"), "utf8");
    expect(src).toContain("CachePatterns.avatarSigned");
  });
});
