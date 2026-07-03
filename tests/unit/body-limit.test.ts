import { describe, expect, it } from "vitest";
import { parseJsonWithLimit } from "@/lib/security/body-limit";
import { ApiError } from "@/lib/api/errors";

function jsonRequest(body: string, contentLength?: number): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentLength !== undefined) {
    headers.set("content-length", String(contentLength));
  }
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers,
    body,
  });
}

describe("parseJsonWithLimit", () => {
  it("parses a small valid body", async () => {
    const req = jsonRequest(JSON.stringify({ a: 1 }));
    await expect(parseJsonWithLimit(req, 1024)).resolves.toEqual({ a: 1 });
  });

  it("rejects when content-length exceeds the limit", async () => {
    const req = jsonRequest(JSON.stringify({ a: 1 }), 5000);
    await expect(parseJsonWithLimit(req, 1024)).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects when the actual body exceeds the limit", async () => {
    const big = JSON.stringify({ a: "x".repeat(2000) });
    const req = jsonRequest(big);
    await expect(parseJsonWithLimit(req, 1024)).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects invalid JSON with a VALIDATION_ERROR", async () => {
    const req = jsonRequest("{not valid json");
    await expect(parseJsonWithLimit(req, 1024)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
