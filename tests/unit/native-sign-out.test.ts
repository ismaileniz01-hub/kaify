import { describe, expect, it } from "vitest";
import { urlHasSignedOutFlag } from "@/lib/native/sign-out-native";
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
    expect(source).toContain("https://localhost/?${SIGNED_OUT_QUERY}");
    expect(source).toContain("capacitor://localhost/?${SIGNED_OUT_QUERY}");
    expect(source).not.toContain('iosScheme: "https"');
  });
});
