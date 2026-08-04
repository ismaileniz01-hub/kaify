import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPaddleSignature } from "@/lib/services/billing.service";

const SECRET = "test-paddle-webhook-secret";

function sign(rawBody: string, ts: number): string {
  const h1 = createHmac("sha256", SECRET).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleSignature", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a fresh valid signature", () => {
    const body = '{"event_id":"evt_1"}';
    const ts = Math.floor(Date.now() / 1000);
    expect(verifyPaddleSignature(body, sign(body, ts), SECRET)).toBe(true);
  });

  it("rejects missing header", () => {
    expect(verifyPaddleSignature("{}", null, SECRET)).toBe(false);
    expect(verifyPaddleSignature("{}", "   ", SECRET)).toBe(false);
  });

  it("rejects tampered body", () => {
    const ts = Math.floor(Date.now() / 1000);
    const header = sign('{"event_id":"a"}', ts);
    expect(verifyPaddleSignature('{"event_id":"b"}', header, SECRET)).toBe(false);
  });

  it("rejects expired timestamps (>5m)", () => {
    const body = "{}";
    const oldTs = Math.floor(Date.now() / 1000) - 6 * 60;
    expect(verifyPaddleSignature(body, sign(body, oldTs), SECRET)).toBe(false);
  });
});
