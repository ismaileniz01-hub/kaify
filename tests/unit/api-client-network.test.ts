import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/security/csrf-client", () => ({
  CSRF_HEADER_NAME: "x-csrf-token",
  readCsrfCookieFromDocument: () => "csrf-test",
}));

vi.mock("@/lib/api/resolve-api-path", () => ({
  resolveApiPath: (path: string) => `https://example.test${path}`,
}));

import { ApiClientError, apiFetch } from "@/lib/api/client";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("crypto", {
    randomUUID: () => "fixed-idem-key-0001",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", fetchMock);
});

describe("apiFetch NETWORK taxonomy", () => {
  it("maps failed fetch to ApiClientError NETWORK", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/api/session", { method: "GET" })).rejects.toMatchObject({
      name: "ApiClientError",
      code: "NETWORK",
      message: "Bağlantı kurulamadı.",
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("maps abort/timeout to NETWORK instead of a raw abort", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

    try {
      await apiFetch("/api/profile", { method: "PATCH", body: "{}" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).code).toBe("NETWORK");
    }
  });

  it("keeps a 12s client timeout", () => {
    const src = readFileSync(join(process.cwd(), "lib/api/client.ts"), "utf8");
    expect(src).toContain("FETCH_TIMEOUT_MS = 12_000");
    expect(src).toContain("AbortSignal.timeout");
  });
});
