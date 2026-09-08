import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  NATIVE_ENTRY_BOOT_CSP_HASH,
  NATIVE_ENTRY_BOOT_SCRIPT,
  NATIVE_ENTRY_TOKEN_KEY,
  NATIVE_WELCOME_HANDOFF_PATH,
  clearNativeEntryTokens,
  hasNativeHandoffQuery,
  isCapacitorNativeShell,
  nativeEntryShellUrl,
  parseNativeEntryHash,
  readNativeEntryAccessToken,
  readNativeEntrySession,
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

  it("opens Home immediately without fetch or form POST", () => {
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("location.replace(");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_WELCOME_HANDOFF_PATH);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("document.cookie");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("fetch(");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("form.submit()");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("useEffect");
    expect(hasNativeHandoffQuery("?native_handoff=1")).toBe(true);
    expect(hasNativeHandoffQuery("?next=/welcome")).toBe(false);
  });

  it("pins a CSP hash that matches the boot script bytes", () => {
    const hash = `sha256-${createHash("sha256").update(NATIVE_ENTRY_BOOT_SCRIPT.replace(/\r\n/g, "\n")).digest("base64")}`;
    expect(NATIVE_ENTRY_BOOT_CSP_HASH).toBe(hash);
  });

  it("reads stored native-entry tokens without calling supabase", () => {
    sessionStorage.setItem(
      NATIVE_ENTRY_TOKEN_KEY,
      JSON.stringify({ accessToken: "abc", refreshToken: "def" }),
    );
    expect(readNativeEntryAccessToken()).toBe("abc");
    expect(readNativeEntrySession()).toEqual({
      accessToken: "abc",
      refreshToken: "def",
    });
    clearNativeEntryTokens();
    expect(readNativeEntryAccessToken()).toBeNull();
    expect(isCapacitorNativeShell()).toBe(false);
  });
});
