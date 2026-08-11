import { describe, expect, it } from "vitest";
import {
  resolveSafeNotificationUrl,
  SAFE_NOTIFICATION_FALLBACK,
} from "@/lib/security/safe-notification-url";

const ORIGIN = "https://kaifyai.org";

describe("resolveSafeNotificationUrl (SEC-001)", () => {
  it("allows same-origin relative URLs", () => {
    expect(resolveSafeNotificationUrl("/welcome", ORIGIN)).toBe("/welcome");
    expect(resolveSafeNotificationUrl("/chat/kai?x=1", ORIGIN)).toBe(
      "/chat/kai?x=1",
    );
  });

  it("allows same-origin absolute URLs", () => {
    expect(
      resolveSafeNotificationUrl("https://kaifyai.org/settings", ORIGIN),
    ).toBe("/settings");
  });

  it("rejects external https URLs", () => {
    expect(
      resolveSafeNotificationUrl("https://evil.example/phish", ORIGIN),
    ).toBe(SAFE_NOTIFICATION_FALLBACK);
  });

  it("rejects protocol-relative external destinations", () => {
    expect(resolveSafeNotificationUrl("//evil.example/x", ORIGIN)).toBe(
      SAFE_NOTIFICATION_FALLBACK,
    );
  });

  it("rejects javascript: and data:", () => {
    expect(resolveSafeNotificationUrl("javascript:alert(1)", ORIGIN)).toBe(
      SAFE_NOTIFICATION_FALLBACK,
    );
    expect(
      resolveSafeNotificationUrl("data:text/html,hi", ORIGIN),
    ).toBe(SAFE_NOTIFICATION_FALLBACK);
  });

  it("rejects malformed URLs and missing values", () => {
    expect(resolveSafeNotificationUrl("https://", ORIGIN)).toBe(
      SAFE_NOTIFICATION_FALLBACK,
    );
    expect(resolveSafeNotificationUrl("", ORIGIN)).toBe(
      SAFE_NOTIFICATION_FALLBACK,
    );
    expect(resolveSafeNotificationUrl(null, ORIGIN)).toBe(
      SAFE_NOTIFICATION_FALLBACK,
    );
    expect(resolveSafeNotificationUrl(undefined, ORIGIN)).toBe(
      SAFE_NOTIFICATION_FALLBACK,
    );
  });

  it("mirrors validation into public/sw.js", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    expect(sw).toContain("resolveSafeNotificationUrl");
    expect(sw).toContain("javascript:");
    expect(sw).toContain("SAFE_NOTIFICATION_FALLBACK");
  });
});
