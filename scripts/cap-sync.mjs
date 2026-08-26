/**
 * Builds the local native UI, then runs Capacitor sync.
 *
 * Usage:
 *   node scripts/cap-sync.mjs
 *   CAPACITOR_SERVER_URL=http://10.0.2.2:3000 node scripts/cap-sync.mjs
 */
import { execSync } from "node:child_process";

const argUrl = process.argv[2]?.trim();
const requestedUrl = argUrl || process.env.CAPACITOR_SERVER_URL?.trim();
if (requestedUrl && !requestedUrl.startsWith("http://")) {
  throw new Error(
    "CAPACITOR_SERVER_URL is development-only and must use http://. Production builds always use native-dist.",
  );
}

console.log(
  requestedUrl
    ? `[cap-sync] development server=${requestedUrl}`
    : "[cap-sync] production local bundle=native-dist",
);

execSync("npm run native:build", { stdio: "inherit" });

const syncEnv = { ...process.env };
if (requestedUrl) syncEnv.CAPACITOR_SERVER_URL = requestedUrl;
else delete syncEnv.CAPACITOR_SERVER_URL;

execSync("npx cap sync", {
  stdio: "inherit",
  env: syncEnv,
});
