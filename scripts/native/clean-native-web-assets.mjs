/**
 * Removes previously synced Capacitor web assets before a fresh native build.
 * Only touches known generated directories — never source code.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const targets = [
  "native-dist",
  "android/app/src/main/assets/public",
  "ios/App/App/public",
];

for (const relative of targets) {
  const absolute = join(root, relative);
  if (!existsSync(absolute)) {
    console.log(`[native-clean] skip missing ${relative}`);
    continue;
  }
  rmSync(absolute, { recursive: true, force: true });
  console.log(`[native-clean] removed ${relative}`);
}
