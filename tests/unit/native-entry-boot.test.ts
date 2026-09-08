import { describe, expect, it } from "vitest";
import {
  NATIVE_ENTRY_BOOT_SCRIPT,
  NATIVE_ENTRY_COMPLETE_PATH,
  NATIVE_ENTRY_TOKEN_KEY,
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

  it("submits tokens as a same-origin document POST, not fetch", () => {
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_ENTRY_COMPLETE_PATH);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain('form.method = "POST"');
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("form.submit()");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("accessToken");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("refreshToken");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("fetch(");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("useEffect");
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
