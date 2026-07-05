import { afterEach, describe, expect, it, vi } from "vitest";
import { mintCsrfToken } from "@/lib/security/csrf";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("csrf", () => {
  it("mints verifiable tokens", async () => {
    vi.stubEnv("CSRF_SECRET", "test-csrf-secret-key");
    const token = await mintCsrfToken();
    expect(token.includes(".")).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });
});
