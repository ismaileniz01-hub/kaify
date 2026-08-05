import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function text(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const [aasa, assetLinks, privacy, infoPlist, androidManifest] =
  await Promise.all([
    text("public/.well-known/apple-app-site-association"),
    text("public/.well-known/assetlinks.json"),
    text("ios/App/App/PrivacyInfo.xcprivacy"),
    text("ios/App/App/Info.plist"),
    text("android/app/src/main/AndroidManifest.xml"),
  ]);

const errors = [];

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) errors.push(message);
}

function forbid(source, pattern, message) {
  if (pattern.test(source)) errors.push(message);
}

forbid(
  aasa,
  /APPLE_TEAM_ID/,
  "Replace APPLE_TEAM_ID in apple-app-site-association.",
);
forbid(
  assetLinks,
  /REPLACE_WITH_PLAY/,
  "Replace the Play signing SHA-256 placeholder in assetlinks.json.",
);

for (const dataType of [
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypePhotosorVideos",
  "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypeHealth",
  "NSPrivacyCollectedDataTypeFitness",
  "NSPrivacyCollectedDataTypePurchaseHistory",
  "NSPrivacyCollectedDataTypeCrashData",
  "NSPrivacyCollectedDataTypePerformanceData",
]) {
  requireMatch(
    privacy,
    new RegExp(`<string>${dataType}</string>`),
    `PrivacyInfo.xcprivacy is missing ${dataType}.`,
  );
}

requireMatch(
  infoPlist,
  /<string>kaify<\/string>/,
  "Info.plist is missing the kaify URL scheme.",
);
requireMatch(
  androidManifest,
  /android:scheme="kaify"/,
  "AndroidManifest.xml is missing the kaify URL scheme.",
);

if (errors.length > 0) {
  console.error("Store readiness verification failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Store readiness static checks passed.");
