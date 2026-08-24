import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("native health manifests", () => {
  it("declares HealthKit usage strings", () => {
    const plist = readFileSync(
      join(process.cwd(), "ios/App/App/Info.plist"),
      "utf8",
    );
    expect(plist).toContain("NSHealthShareUsageDescription");
    expect(plist).toContain("NSHealthUpdateUsageDescription");
  });

  it("points Health Connect at the public privacy policy", () => {
    const xml = readFileSync(
      join(process.cwd(), "android/app/src/main/res/values/strings.xml"),
      "utf8",
    );
    expect(xml).toContain("health_connect_privacy_policy_url");
    expect(xml).toContain("https://kaifyai.org/privacy");
  });

  it("raises Android minSdk for Health Connect", () => {
    const gradle = readFileSync(
      join(process.cwd(), "android/variables.gradle"),
      "utf8",
    );
    expect(gradle).toMatch(/minSdkVersion\s*=\s*26/);
  });
});
