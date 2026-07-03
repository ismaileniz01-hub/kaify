import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { handleSenderSubscribe } from "@/lib/marketing/sender";
import { subscribeSchema } from "@/lib/api-security";

/** Minimal NextRequest stand-in: the handler only reads method + text(). */
function jsonRequest(body: unknown, method = "POST"): NextRequest {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { method, text: async () => text } as unknown as NextRequest;
}

const validBody = {
  email: "real.user@gmail.com",
  firstName: "Ada",
  lastName: "Lovelace",
  recaptchaToken: "tok",
};

const originalFetch = global.fetch;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("RECAPTCHA_SECRET_KEY", ""); // unset -> validateRecaptcha skips (returns true)
});

afterEach(() => {
  vi.unstubAllEnvs();
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("handleSenderSubscribe", () => {
  it("rejects a non-JSON body with 400", async () => {
    const res = await handleSenderSubscribe(jsonRequest("<<not json>>"), "test", subscribeSchema);
    expect(res.status).toBe(400);
  });

  it("rejects a payload missing the recaptcha token with 400", async () => {
    const res = await handleSenderSubscribe(
      jsonRequest({ email: "a@gmail.com", firstName: "A" }),
      "test",
      subscribeSchema,
    );
    expect(res.status).toBe(400);
  });

  it("blocks disposable email domains with 400", async () => {
    const res = await handleSenderSubscribe(
      jsonRequest({ ...validBody, email: "throwaway@mailinator.com" }),
      "test",
      subscribeSchema,
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 when SENDER_API_KEY is not configured", async () => {
    vi.stubEnv("SENDER_API_KEY", "");
    const res = await handleSenderSubscribe(jsonRequest(validBody), "test", subscribeSchema);
    expect(res.status).toBe(500);
  });

  it("subscribes a valid user and forwards Sender.net fields", async () => {
    vi.stubEnv("SENDER_API_KEY", "real_key_123");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await handleSenderSubscribe(jsonRequest(validBody), "test", subscribeSchema);
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.email).toBe("real.user@gmail.com");
    expect(sent.firstname).toBe("Ada");
    expect(sent.lastname).toBe("Lovelace");
  });

  it("treats an already-subscribed response as success", async () => {
    vi.stubEnv("SENDER_API_KEY", "real_key_123");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "already subscribed" }), { status: 409 }),
    ) as unknown as typeof fetch;

    const res = await handleSenderSubscribe(jsonRequest(validBody), "test", subscribeSchema);
    expect(res.status).toBe(200);
  });
});
