#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const r = spawnSync(
  "npx",
  ["vitest", "run", "tests/security/ai-injection-redteam.test.ts"],
  { stdio: "inherit", shell: true },
);

process.exit(r.status ?? 1);
