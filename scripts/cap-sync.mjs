/**
 * Builds the local native UI, then runs Capacitor sync.
 *
 * Usage:
 *   node scripts/cap-sync.mjs
 *     → store/local native-dist (ADR 007)
 *   CAPACITOR_SERVER_URL=http://10.0.2.2:3000 node scripts/cap-sync.mjs
 *     → LAN Next.js for emulator/device
 *   CAPACITOR_SERVER_URL=https://kaifyai.org node scripts/cap-sync.mjs
 *     → internal QA WebView of production web (full product). Not for store.
 */
import { execSync } from "node:child_process";

const ALLOWED_TEST_WEBVIEW_URLS = new Set([
  "https://kaifyai.org",
  "https://www.kaifyai.org",
]);

function resolveServerUrl(raw) {
  const requested = raw?.trim().replace(/\/$/, "");
  if (!requested) return undefined;
  if (requested.startsWith("http://")) return requested;
  if (ALLOWED_TEST_WEBVIEW_URLS.has(requested)) return requested;
  throw new Error(
    `CAPACITOR_SERVER_URL rejected: ${requested}. Use http:// for LAN Next, or exactly https://kaifyai.org for internal QA. Store builds must omit the URL.`,
  );
}

const argUrl = process.argv[2]?.trim();
const requestedUrl = resolveServerUrl(
  argUrl || process.env.CAPACITOR_SERVER_URL,
);

if (requestedUrl?.startsWith("https://")) {
  console.log(
    `[cap-sync] INTERNAL QA WebView=${requestedUrl} (full product — do not submit this sync to App Store / Play)`,
  );
} else if (requestedUrl) {
  console.log(`[cap-sync] development server=${requestedUrl}`);
} else {
  console.log("[cap-sync] production local bundle=native-dist");
}

execSync("npm run native:build", { stdio: "inherit" });

const syncEnv = { ...process.env };
if (requestedUrl) syncEnv.CAPACITOR_SERVER_URL = requestedUrl;
else delete syncEnv.CAPACITOR_SERVER_URL;

execSync("npx cap sync", {
  stdio: "inherit",
  env: syncEnv,
});
