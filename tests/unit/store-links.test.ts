import { describe, expect, it } from "vitest";
import { NATIVE_APP_ID } from "@/lib/app-url";
import { PLAY_STORE_URL, APP_STORE_URL } from "@/lib/marketing/store-links";
import {
  NATIVE_CHECKOUT_RETURN_URL,
  POST_SIGNUP_CHECKOUT_URL,
  WEB_PRICING_URL,
} from "@/lib/billing/native-web-checkout";

describe("store package id alignment", () => {
  it("Play Store URL uses org.kaify.app", () => {
    expect(NATIVE_APP_ID).toBe("org.kaify.app");
    expect(PLAY_STORE_URL).toContain(`id=${NATIVE_APP_ID}`);
    expect(PLAY_STORE_URL).not.toContain("org.kaifyai.app");
  });

  it("App Store URL is overridable and non-empty", () => {
    expect(APP_STORE_URL).toMatch(/^https:\/\//);
  });

  it("web pricing URL is on the canonical site", () => {
    expect(WEB_PRICING_URL).toBe("https://kaifyai.org/pricing");
    expect(POST_SIGNUP_CHECKOUT_URL).toBe("https://kaifyai.org/pricing?checkout=pro");
  });

  it("website checkout returns to native sign-in", () => {
    expect(NATIVE_CHECKOUT_RETURN_URL).toBe("kaify://login");
  });
});
