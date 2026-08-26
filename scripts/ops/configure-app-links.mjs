import { writeFile } from "node:fs/promises";
import path from "node:path";

const teamId = process.env.APPLE_TEAM_ID?.trim() ?? "";
const fingerprints = (process.env.ANDROID_APP_LINK_SHA256 ?? "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

if (!/^[A-Z0-9]{10}$/.test(teamId)) {
  throw new Error("APPLE_TEAM_ID must be the 10-character Apple Developer Team ID.");
}
if (
  fingerprints.length === 0 ||
  fingerprints.some(
    (value) => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value),
  )
) {
  throw new Error(
    "ANDROID_APP_LINK_SHA256 must contain one or more comma-separated SHA-256 certificate fingerprints.",
  );
}

const root = process.cwd();
const assetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "org.kaifyai.app",
      sha256_cert_fingerprints: fingerprints,
    },
  },
];
const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${teamId}.org.kaifyai.app`,
        paths: [
          "/login*",
          "/signup*",
          "/welcome*",
          "/chat*",
          "/pricing*",
          "/privacy*",
          "/terms*",
          "/settings*",
          "/streak*",
          "/leaderboard*",
          "/trophy-road*",
          "/myaccount*",
        ],
      },
    ],
  },
  webcredentials: {
    apps: [`${teamId}.org.kaifyai.app`],
  },
};

await Promise.all([
  writeFile(
    path.join(root, "public", ".well-known", "assetlinks.json"),
    `${JSON.stringify(assetLinks, null, 2)}\n`,
  ),
  writeFile(
    path.join(root, "public", ".well-known", "apple-app-site-association"),
    `${JSON.stringify(aasa, null, 2)}\n`,
  ),
]);

console.log("Configured Android App Links and Apple Universal Links.");
