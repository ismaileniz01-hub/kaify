import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NATIVE_APP_ID, NATIVE_URL_SCHEME } from "@/lib/app-url";
import { PLAY_STORE_URL, APP_STORE_URL } from "@/lib/marketing/store-links";
import {
  NATIVE_CHECKOUT_RETURN_URL,
  POST_SIGNUP_CHECKOUT_URL,
  WEB_PRICING_URL,
} from "@/lib/billing/native-web-checkout";

const CANONICAL_APP_ID = "org.kaifyai.app";
const LEGACY_APP_ID = "org.kaify.app";
const APPLE_TEAM_ID = "APZ7L5F5UZ";
const PLAY_APP_SIGNING_SHA256 =
  "C9:A3:EC:0B:AD:B7:85:39:DF:94:A5:40:45:43:B8:1B:59:CC:91:B3:09:2F:13:48:A1:12:E8:04:EB:C2:74:98";
const PLAY_UPLOAD_KEY_SHA256 =
  "E4:09:C6:A7:D6:C4:B8:ED:52:6A:C9:7D:6B:85:4A:6D:07:C9:BD:13:43:B0:51:40:46:40:BE:7B:91:3E:87:BD";
const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("store package id alignment", () => {
  it("Play Store URL uses org.kaifyai.app", () => {
    expect(NATIVE_APP_ID).toBe(CANONICAL_APP_ID);
    expect(PLAY_STORE_URL).toContain(`id=${NATIVE_APP_ID}`);
    expect(PLAY_STORE_URL).not.toContain(LEGACY_APP_ID);
  });

  it("Capacitor, Android, and iOS identities match org.kaifyai.app", () => {
    const capacitor = read("capacitor.config.ts");
    const gradle = read("android/app/build.gradle");
    const proguard = read("android/app/proguard-rules.pro");
    const strings = read("android/app/src/main/res/values/strings.xml");
    const mainActivity = read(
      "android/app/src/main/java/org/kaifyai/app/MainActivity.java",
    );
    const pbxproj = read("ios/App/App.xcodeproj/project.pbxproj");
    const infoPlist = read("ios/App/App/Info.plist");
    const aasa = read("public/.well-known/apple-app-site-association");
    const assetlinks = read("public/.well-known/assetlinks.json");

    expect(capacitor).toContain(`appId: "${CANONICAL_APP_ID}"`);
    expect(capacitor).not.toContain(LEGACY_APP_ID);

    expect(gradle).toContain(`namespace = "${CANONICAL_APP_ID}"`);
    expect(gradle).toContain(`applicationId "${CANONICAL_APP_ID}"`);
    expect(gradle).not.toContain(LEGACY_APP_ID);

    expect(proguard).toContain(`-keep class ${CANONICAL_APP_ID}.**`);
    expect(proguard).not.toContain(LEGACY_APP_ID);

    expect(strings).toContain(`>${CANONICAL_APP_ID}<`);
    expect(strings).not.toContain(LEGACY_APP_ID);

    expect(mainActivity).toContain(`package ${CANONICAL_APP_ID};`);
    expect(mainActivity).not.toContain(LEGACY_APP_ID);

    expect(pbxproj).toContain(`PRODUCT_BUNDLE_IDENTIFIER = ${CANONICAL_APP_ID};`);
    expect(pbxproj).not.toContain(LEGACY_APP_ID);

    expect(infoPlist).toContain(`<string>${CANONICAL_APP_ID}</string>`);
    expect(infoPlist).toContain(`<string>${NATIVE_URL_SCHEME}</string>`);
    expect(infoPlist).not.toContain(LEGACY_APP_ID);

    expect(aasa).toContain(`${APPLE_TEAM_ID}.${CANONICAL_APP_ID}`);
    expect(aasa).not.toContain("APPLE_TEAM_ID");
    expect(aasa).not.toContain(LEGACY_APP_ID);

    expect(assetlinks).toContain(`"package_name": "${CANONICAL_APP_ID}"`);
    expect(assetlinks).toContain(PLAY_APP_SIGNING_SHA256);
    expect(assetlinks).not.toContain("REPLACE_WITH_PLAY");
    expect(assetlinks).not.toContain(PLAY_UPLOAD_KEY_SHA256);
    expect(assetlinks).not.toContain(LEGACY_APP_ID);
  });

  it("custom URL scheme remains kaify", () => {
    expect(NATIVE_URL_SCHEME).toBe("kaify");
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain(
      'android:scheme="kaify"',
    );
  });

  it("App Store URL is overridable and non-empty", () => {
    expect(APP_STORE_URL).toMatch(/^https:\/\//);
  });

  it("web pricing URL is on the canonical site", () => {
    expect(WEB_PRICING_URL).toBe("https://kaifyai.org/pricing");
    expect(POST_SIGNUP_CHECKOUT_URL).toBe("https://kaifyai.org/pricing");
  });

  it("website checkout returns to native sign-in", () => {
    expect(NATIVE_CHECKOUT_RETURN_URL).toBe("kaify://login");
  });
});
