import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native API CORS allow-headers", () => {
  it("allows X-Client-Version on general API CORS (profile/consent after OTP)", () => {
    const middleware = source("middleware.ts");
    expect(middleware).toContain("X-Client-Version");
    expect(middleware).toMatch(
      /CORS_ALLOW_HEADERS[\s\S]*X-Client-Version/,
    );
    // Regression: OTP-only allowlist is not enough — post-login /api/v1/*
    // preflight uses attachCorsHeaders.
    expect(middleware).toContain("attachCorsHeaders");
  });
});
