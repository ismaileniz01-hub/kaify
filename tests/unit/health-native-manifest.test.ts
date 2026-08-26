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

  it("declares Health Connect step permissions and rationale", () => {
    const xml = readFileSync(
      join(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
      "utf8",
    );
    expect(xml).toContain("android.permission.health.READ_STEPS");
    expect(xml).toContain("android.permission.ACTIVITY_RECOGNITION");
    expect(xml).toContain("com.google.android.apps.healthdata");
    expect(xml).toContain("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE");
    expect(xml).toContain("android.intent.category.HEALTH_PERMISSIONS");
  });

  it("enables the HealthKit entitlement", () => {
    const entitlements = readFileSync(
      join(process.cwd(), "ios/App/App/App.entitlements"),
      "utf8",
    );
    expect(entitlements).toContain("com.apple.developer.healthkit");
    const pbx = readFileSync(
      join(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"),
      "utf8",
    );
    expect(pbx).toContain("CODE_SIGN_ENTITLEMENTS = App/App.entitlements");
  });
});
