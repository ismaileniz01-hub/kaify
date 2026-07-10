#!/usr/bin/env node
/**
 * Upsert a single env var on Vercel for all environments.
 * Usage: node scripts/vercel-env-upsert.mjs NAME value
 */
import { spawnSync } from "node:child_process";

const [name, value] = process.argv.slice(2);
if (!name || !value) {
  console.error("Usage: node scripts/vercel-env-upsert.mjs NAME value");
  process.exit(1);
}

for (const environment of ["production", "preview", "development"]) {
  spawnSync("npx", ["vercel", "env", "rm", name, environment, "--yes"], {
    stdio: "ignore",
    shell: true,
  });
  const add = spawnSync("npx", ["vercel", "env", "add", name, environment], {
    input: value,
    encoding: "utf8",
    shell: true,
  });
  if (add.status !== 0) {
    console.error(add.stdout || add.stderr);
    process.exit(1);
  }
  console.log(`✓ ${name} → ${environment}`);
}
