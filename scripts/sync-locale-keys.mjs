#!/usr/bin/env node
/**
 * Ensures every locale JSON has all keys from en.json.
 * Missing keys are filled with the English value (safe fallback).
 * Does NOT overwrite existing translations.
 *
 * Usage: node scripts/sync-locale-keys.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANG_DIR = join(__dirname, "..", "lib", "lang");

const source = JSON.parse(readFileSync(join(LANG_DIR, "en.json"), "utf8"));
const sourceKeys = Object.keys(source);

const files = readdirSync(LANG_DIR).filter((f) => f.endsWith(".json") && f !== "en.json");

for (const file of files) {
  const code = file.replace(/\.json$/, "");
  const path = join(LANG_DIR, file);
  const target = JSON.parse(readFileSync(path, "utf8"));
  let added = 0;

  for (const key of sourceKeys) {
    if (target[key] === undefined) {
      target[key] = source[key];
      added++;
    }
  }

  const ordered = {};
  for (const key of sourceKeys) {
    if (target[key] !== undefined) ordered[key] = target[key];
  }
  for (const key of Object.keys(target)) {
    if (ordered[key] === undefined) ordered[key] = target[key];
  }

  writeFileSync(path, JSON.stringify(ordered, null, 2) + "\n", "utf8");
  console.log(`${code}: +${added} keys (${Object.keys(ordered).length} total)`);
}

console.log("Done.");
