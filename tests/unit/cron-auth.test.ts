import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isCronSecretConfigured, verifyCronSecret } from "@/lib/api/cron-auth";

describe("cron-auth", () => {
  const original = process.env.CRON_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("rejects placeholder secrets", () => {
    process.env.CRON_SECRET = "your_secret_here";
    expect(isCronSecretConfigured()).toBe(false);
    expect(verifyCronSecret(new Request("http://x", {
      headers: { authorization: "Bearer your_secret_here" },
    }))).toBe(false);
  });

  it("accepts valid bearer token with trim", () => {
    process.env.CRON_SECRET = "  real-secret  ";
    expect(isCronSecretConfigured()).toBe(true);
    expect(verifyCronSecret(new Request("http://x", {
      headers: { authorization: "Bearer real-secret" },
    }))).toBe(true);
  });

  it("rejects missing or wrong token", () => {
    process.env.CRON_SECRET = "abc";
    expect(verifyCronSecret(new Request("http://x"))).toBe(false);
    expect(verifyCronSecret(new Request("http://x", {
      headers: { authorization: "Bearer wrong" },
    }))).toBe(false);
  });
});
