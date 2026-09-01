import { describe, expect, it } from "vitest";
import {
  NATIVE_ENTRY_BOOT_SCRIPT,
  NATIVE_ENTRY_ESTABLISH_PATH,
  NATIVE_ENTRY_SUCCESS_PATH,
  NATIVE_ENTRY_TIMEOUT_MS,
  nativeEntryShellUrl,
  parseNativeEntryHash,
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

  it("posts cookies then opens welcome, with a bounded wait", () => {
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_ENTRY_ESTABLISH_PATH);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(NATIVE_ENTRY_SUCCESS_PATH);
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain(String(NATIVE_ENTRY_TIMEOUT_MS));
    expect(NATIVE_ENTRY_BOOT_SCRIPT).toContain("AbortController");
    expect(NATIVE_ENTRY_BOOT_SCRIPT).not.toContain("useEffect");
  });
});
