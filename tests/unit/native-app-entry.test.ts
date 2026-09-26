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

  it("keeps only the marketing landing web-only", () => {
    expect(isWebOnlyPath("/")).toBe(true);
    expect(isWebOnlyPath("/signup")).toBe(false);
    expect(isWebOnlyPath("/pricing")).toBe(false);
    expect(isWebOnlyPath("/login")).toBe(false);
  });

  it.each(["/login", "/signup", "/welcome", "/settings", "/chat/kai"])(
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
