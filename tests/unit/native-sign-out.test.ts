import { describe, expect, it } from "vitest";
import { urlHasSignedOutFlag } from "@/lib/native/sign-out-native";
import { nativeShellOriginForUserAgent } from "@/lib/native/native-entry-boot";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("native sign-out handoff", () => {
  it("reads the signed_out query flag", () => {
    expect(urlHasSignedOutFlag("signed_out=1")).toBe(true);
    expect(urlHasSignedOutFlag("?signed_out=1")).toBe(true);
    expect(urlHasSignedOutFlag("foo=1")).toBe(false);
  });

  it("returns Android to https://localhost and iOS to capacitor://localhost", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/native/sign-out-native.ts"),
      "utf8",
    );
    expect(source).toContain("ANDROID_SHELL_ORIGIN");
    expect(source).toContain("IOS_SHELL_ORIGIN");
    expect(source).toContain("export function looksLikeNativeWebView");
    expect(nativeShellOriginForUserAgent("Mozilla/5.0 (Linux; Android 14; wv)")).toBe(
      "https://localhost",
    );
    expect(
      nativeShellOriginForUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"),
    ).toBe("capacitor://localhost");
  });
});
