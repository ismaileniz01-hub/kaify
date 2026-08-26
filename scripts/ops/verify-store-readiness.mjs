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
requireMatch(
  aasa,
  /APZ7L5F5UZ\.org\.kaifyai\.app/,
  "apple-app-site-association must use APZ7L5F5UZ.org.kaifyai.app.",
);
forbid(
  aasa,
  /org\.kaify\.app/,
  "apple-app-site-association must not reference legacy org.kaify.app.",
);
requireMatch(
  assetLinks,
  /"package_name":\s*"org\.kaifyai\.app"/,
  "assetlinks.json must use package_name org.kaifyai.app.",
);
requireMatch(
  assetLinks,
  /C9:A3:EC:0B:AD:B7:85:39:DF:94:A5:40:45:43:B8:1B:59:CC:91:B3:09:2F:13:48:A1:12:E8:04:EB:C2:74:98/,
  "assetlinks.json must include the Play App Signing SHA-256 fingerprint.",
);
forbid(
  assetLinks,
  /E4:09:C6:A7:D6:C4:B8:ED:52:6A:C9:7D:6B:85:4A:6D:07:C9:BD:13:43:B0:51:40:46:40:BE:7B:91:3E:87:BD/,
  "assetlinks.json must not include the Play upload-key SHA-256.",
);
forbid(
  assetLinks,
  /org\.kaify\.app/,
  "assetlinks.json must not reference legacy org.kaify.app.",
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
