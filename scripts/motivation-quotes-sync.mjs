#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QUOTES_DIR = join(ROOT, "lib", "motivation-quotes");
const LOCALES = [
  "de", "fr", "es", "es-mx", "es-ar", "it", "pt", "nl", "ru", "pl", "ro", "el", "sv",
  "cs", "hu", "uk", "da", "no", "fi", "lt", "lv", "et", "sk", "sl", "hr", "bg", "sr", "is",
  "mt", "sq", "bs", "mk", "be", "lb", "kk", "uz", "az", "ar", "he", "fa", "ur", "af", "yo",
  "hi", "zh-CN", "ja", "ko", "vi", "th", "id", "ms", "bn",
];

const en = JSON.parse(readFileSync(join(QUOTES_DIR, "en.json"), "utf8"));
let written = 0;

for (const code of LOCALES) {
  const path = join(QUOTES_DIR, `${code}.json`);
  writeFileSync(path, JSON.stringify(en, null, 2) + "\n", "utf8");
  written++;
  console.log(`→ ${code}.json`);
}

// tr.json is maintained by build-motivation-quotes.mjs (native Turkish lines)
console.log("skip tr.json (maintained by quotes:build)");

console.log(`Done. ${written} file(s) created.`);
