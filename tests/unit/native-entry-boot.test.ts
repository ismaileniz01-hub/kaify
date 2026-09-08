import { describe, expect, it } from "vitest";
import {
  NATIVE_ENTRY_BOOT_SCRIPT,
  NATIVE_ENTRY_ESTABLISH_PATH,
  NATIVE_ENTRY_NAVIGATE_MS,
  NATIVE_ENTRY_SUCCESS_PATH,
  NATIVE_ENTRY_TOKEN_KEY,
  NATIVE_SESSION_HINT_COOKIE,
  clearNativeEntryTokens,
  isCapacitorNativeShell,
  nativeEntryShellUrl,
  parseNativeEntryHash,
  readNativeEntryAccessToken,
} from "@/lib/native/native-entry-boot";

describe("native-entry boot", () => {
  it("reads hash tokens without treating empty values as a session", () => {
    expect(parseNativeEntryHash("#access_token=a&refresh_token=b")).toEqual({
      accessToken: "a",
      refreshToken: "b",
    });
    expect(parseNativeEntryHash("access_token=&refresh_token=b")).toBeNull();
    expect(parseNativeEntryHash("")).toBeNull();
  });

  it("returns Capacitor shells without forcing iOS onto https", () => {
    expect(nativeEntryShellUrl("Mozilla/5.0 (Linux; Android 14)")).toBe(
      "https://localhost/?signed_out=1",
    );
    expect(nativeEntryShellUrl("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0")).toBe(
      "capacitor://localhost/?signed_out=1",
    );
    expect(nativeEntryShellUrl("Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe(
      "/login",
    );
  });

  it("opens welcome even if cookie establish hangs, using a first-party hint", () => {
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_ENTRY_ESTABLISH_PATH);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_ENTRY_SUCCESS_PATH);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(String(NATIVE_ENTRY_NAVIGATE_MS));
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_SESSION_HINT_COOKIE);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("goWelcome");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("localStorage");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("AbortController");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("useEffect");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("removeItem(TOKEN_KEY)");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("if (!res.ok)");
  });

  it("reads stored native-entry tokens without calling supabase", () => {
    sessionStorage.setItem(
      NATIVE_ENTRY_TOKEN_KEY,
      JSON.stringify({ accessToken: "abc", refreshToken: "def" }),
    );
    expect(readNativeEntryAccessToken()).toBe("abc");
    clearNativeEntryTokens();
    expect(readNativeEntryAccessToken()).toBeNull();
    expect(isCapacitorNativeShell()).toBe(false);
  });
});
