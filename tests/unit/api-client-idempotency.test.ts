import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/security/csrf-client", () => ({
  CSRF_HEADER_NAME: "x-csrf-token",
  readCsrfCookieFromDocument: () => "csrf-test",
}));

vi.mock("@/lib/api/resolve-api-path", () => ({
  resolveApiPath: (path: string) => `https://example.test${path}`,
}));

import {
  apiFetch,
  createIdempotencyKey,
  IDEMPOTENCY_HEADER,
} from "@/lib/api/client";

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

describe("apiFetch idempotency (REL-001)", () => {
  it("does not attach Idempotency-Key on GET", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
    await apiFetch("/api/session", { method: "GET" });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers[IDEMPOTENCY_HEADER]).toBeUndefined();
  });

  it("attaches a key on POST and reuses it across network retries", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, data: { ok: true } }),
      });

    await apiFetch("/api/settings", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const key1 = fetchMock.mock.calls[0][1].headers[IDEMPOTENCY_HEADER];
    const key2 = fetchMock.mock.calls[1][1].headers[IDEMPOTENCY_HEADER];
    expect(key1).toBe("fixed-idem-key-0001");
    expect(key2).toBe(key1);
  });

  it("reuses a caller-supplied Idempotency-Key", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
    await apiFetch("/api/consent", {
      method: "POST",
      headers: { [IDEMPOTENCY_HEADER]: "client-provided-key" },
      body: "{}",
    });
    expect(fetchMock.mock.calls[0][1].headers[IDEMPOTENCY_HEADER]).toBe(
      "client-provided-key",
    );
  });

  it("createIdempotencyKey returns distinct values for new mutations", () => {
    let n = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid-${++n}`,
    });
    expect(createIdempotencyKey()).toBe("uuid-1");
    expect(createIdempotencyKey()).toBe("uuid-2");
  });
});
