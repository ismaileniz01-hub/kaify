#!/usr/bin/env node
/**
 * Import user-provided quote translations from lib/motivation-quotes/incoming/
 * Usage: node scripts/motivation-quotes-import.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QUOTES_DIR = join(ROOT, "lib", "motivation-quotes");
const INCOMING = join(QUOTES_DIR, "incoming");
const EXPECTED = JSON.parse(readFileSync(join(QUOTES_DIR, "en.json"), "utf8")).length;

if (!existsSync(INCOMING)) mkdirSync(INCOMING, { recursive: true });

const files = readdirSync(INCOMING).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.log(`No files in ${INCOMING}. Drop <locale>.json files there.`);
  process.exit(0);
}

let ok = 0;
for (const file of files) {
  const code = file.replace(/\.json$/, "");
  const data = JSON.parse(readFileSync(join(INCOMING, file), "utf8"));
  if (!Array.isArray(data)) {
    console.error(`✗ ${file}: not an array`);
    continue;
  }
  if (data.length !== EXPECTED) {
    console.error(`✗ ${file}: expected ${EXPECTED} quotes, got ${data.length}`);
    continue;
  }
  for (const q of data) {
    if (!q.includes(" — ")) {
      console.error(`✗ ${file}: missing author separator in: ${q.slice(0, 50)}`);
      process.exit(1);
    }
  }
  writeFileSync(join(QUOTES_DIR, `${code}.json`), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`✓ ${code}.json`);
  ok++;
}
console.log(`\nImported ${ok} locale(s).`);
