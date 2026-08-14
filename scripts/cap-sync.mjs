/**
 * Capacitor sync helper — sets CAPACITOR_SERVER_URL then runs `cap sync`.
 *
 * Usage:
 *   node scripts/cap-sync.mjs
 *   node scripts/cap-sync.mjs https://kaifyai.org
 *   CAPACITOR_SERVER_URL=http://10.0.2.2:3000 node scripts/cap-sync.mjs
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CANONICAL_APP_URL = "https://kaifyai.org";
const NATIVE_ENTRY_PATH = "/login";

const argUrl = process.argv[2]?.trim();
const serverUrl =
  argUrl ||
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  CANONICAL_APP_URL;

console.log(`[cap-sync] CAPACITOR_SERVER_URL=${serverUrl}`);
console.log(`[cap-sync] Native shell opens at ${serverUrl}${serverUrl.includes(NATIVE_ENTRY_PATH) ? "" : NATIVE_ENTRY_PATH} (via capacitor.config.ts)`);

execSync("npx cap sync", {
  stdio: "inherit",
  env: { ...process.env, CAPACITOR_SERVER_URL: serverUrl },
});

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fallback = join(root, "native", "offline-index.html");
const nativeTargets = [
  join(root, "android", "app", "src", "main", "assets", "public", "index.html"),
  join(root, "ios", "App", "App", "public", "index.html"),
];
if (existsSync(fallback)) {
  for (const dest of nativeTargets) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(fallback, dest);
    console.log(`[cap-sync] wrote native offline fallback ${dest}`);
  }
}
