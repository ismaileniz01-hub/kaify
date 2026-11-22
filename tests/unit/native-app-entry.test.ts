import { describe, expect, it } from "vitest";
import {
  NATIVE_ENTRY_PATH,
  isWebOnlyPath,
  nativeFallbackForWebOnlyPath,
} from "@/lib/native/app-entry";

describe("native packaged route policy", () => {
  it("opens native builds at sign-in", () => {
    expect(NATIVE_ENTRY_PATH).toBe("/login");
  });

  // Store app is members-only (7037ae0): landing, signup and pricing stay on the website.
  it("keeps landing, signup and pricing web-only", () => {
    expect(isWebOnlyPath("/")).toBe(true);
    expect(isWebOnlyPath("/signup")).toBe(true);
    expect(isWebOnlyPath("/pricing")).toBe(true);
    expect(isWebOnlyPath("/login")).toBe(false);
  });

  it.each(["/login", "/welcome", "/settings", "/chat/kai"])(
    "allows %s inside the installed app",
    (path) => {
      expect(isWebOnlyPath(path)).toBe(false);
    },
  );

  it("sends leftover website-only routes to sign-in", () => {
    expect(nativeFallbackForWebOnlyPath("/")).toBe(NATIVE_ENTRY_PATH);
    expect(nativeFallbackForWebOnlyPath("/pricing")).toBe(NATIVE_ENTRY_PATH);
  });
});
