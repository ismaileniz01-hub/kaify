#!/usr/bin/env node
/**
 * i18n-sync-fallback — copies missing keys from en.json into every locale file.
 * Use when Gemini quota is unavailable; existing translations are never overwritten.
 *
 * Usage: node scripts/i18n-sync-fallback.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LANG_DIR = join(ROOT, "lib", "lang");
const SOURCE = "en";
const SKIP = new Set([SOURCE, "zh"]);

function readJson(code) {
  const path = join(LANG_DIR, `${code}.json`);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(code, sourceOrder, dict) {
  const ordered = {};
  for (const key of Object.keys(sourceOrder)) {
    if (dict[key] !== undefined) ordered[key] = dict[key];
  }
  for (const key of Object.keys(dict)) {
    if (ordered[key] === undefined) ordered[key] = dict[key];
  }
  writeFileSync(
    join(LANG_DIR, `${code}.json`),
    JSON.stringify(ordered, null, 2) + "\n",
    "utf8",
  );
}

const source = readJson(SOURCE);
const codes = readdirSync(LANG_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .filter((c) => !SKIP.has(c));

let totalAdded = 0;
for (const code of codes) {
  const target = readJson(code);
  const missing = Object.keys(source).filter((k) => target[k] === undefined);
  if (missing.length === 0) {
    console.log(`✓ ${code}: complete`);
    continue;
  }
  for (const k of missing) {
    target[k] = source[k];
  }
  writeJson(code, source, target);
  totalAdded += missing.length;
  console.log(`→ ${code}: added ${missing.length} key(s) (English fallback)`);
}

console.log(`\nDone. ${totalAdded} fallback string(s) written.`);
