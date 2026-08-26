import { existsSync, mkdirSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stashRoot = join(root, ".capacitor-build-stash");

const serverOnlyEntries = [
  "app/api",
  "app/(app)/admin",
  "middleware.ts",
];

function restoreEntries() {
  for (const relative of [...serverOnlyEntries].reverse()) {
    const stashed = join(stashRoot, relative);
    const original = join(root, relative);
    if (!existsSync(stashed)) continue;
    mkdirSync(dirname(original), { recursive: true });
    renameSync(stashed, original);
  }
}

// Recover safely if a previous build was interrupted after moving server files.
if (existsSync(stashRoot)) restoreEntries();

try {
  for (const relative of serverOnlyEntries) {
    const original = join(root, relative);
    if (!existsSync(original)) continue;
    const stashed = join(stashRoot, relative);
    mkdirSync(dirname(stashed), { recursive: true });
    renameSync(original, stashed);
  }

  const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(process.execPath, [nextCli, "build"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      IS_CAPACITOR: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL || "https://kaifyai.org",
    },
  });

  if (result.status !== 0) process.exitCode = result.status ?? 1;
  if (result.status === 0 && !existsSync(join(root, "out", "login", "index.html"))) {
    console.error("[build:cap] out/login/index.html was not generated");
    process.exitCode = 1;
  }
} finally {
  restoreEntries();
}

