#!/usr/bin/env node
/**
 * i18n-retranslate-identical — re-translates locale values that still equal en.json.
 * Existing non-English translations are never overwritten.
 *
 * Usage:
 *   node scripts/i18n-retranslate-identical.mjs --only de,fr,es
 *   node scripts/i18n-retranslate-identical.mjs --prefix landing.,pricing.,nav.
 *   node scripts/i18n-retranslate-identical.mjs --dry --only de
 *
 * Requires GEMINI_API_KEY (env or .env.local).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LANG_DIR = join(ROOT, "lib", "lang");
const SOURCE = "en";
const MODEL = process.env.GEMINI_TRANSLATE_MODEL || "gemini-2.0-flash";
const CHUNK_SIZE = 35;
const MAX_RETRIES = 4;

const LOCALE_NAMES = {
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish (Spain)",
  "es-mx": "Spanish (Mexico)",
  "es-ar": "Spanish (Argentina)",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  pl: "Polish",
  ro: "Romanian",
  el: "Greek",
  sv: "Swedish",
  cs: "Czech",
  hu: "Hungarian",
  uk: "Ukrainian",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
  sk: "Slovak",
  sl: "Slovenian",
  hr: "Croatian",
  bg: "Bulgarian",
  sr: "Serbian",
  is: "Icelandic",
  mt: "Maltese",
  sq: "Albanian",
  bs: "Bosnian",
  mk: "Macedonian",
  be: "Belarusian",
  lb: "Luxembourgish",
  kk: "Kazakh",
  uz: "Uzbek",
  az: "Azerbaijani",
  ar: "Arabic",
  he: "Hebrew",
  fa: "Persian",
  ur: "Urdu",
  af: "Afrikaans",
  yo: "Yoruba",
  hi: "Hindi",
  "zh-CN": "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  bn: "Bengali",
};

/** Values intentionally kept identical across locales (brands / product nouns). */
const ALLOW_IDENTICAL = new Set([
  "Kaify Ai",
  "Kai",
  "Alex",
  "Maya",
  "Leo",
  "Freezie",
  "Market",
  "OK",
  "VIP",
  "USD",
  "OTP",
  "AI",
]);

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    if (val && !process.env[key]) process.env[key] = val;
  }
}

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

function shouldKeepIdentical(value) {
  const trimmed = value.trim();
  if (ALLOW_IDENTICAL.has(trimmed)) return true;
  if (/^[A-Z0-9+._\-/]{1,12}$/.test(trimmed)) return true;
  if (/^\$[\d.,]+/.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set (env or .env.local).");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return JSON.parse(text);
}

async function translateChunk(entries, langName) {
  const payload = Object.fromEntries(entries);
  const prompt = [
    `You are a professional app localizer. Translate the JSON string VALUES below into ${langName}.`,
    "Rules:",
    "- Return ONLY a JSON object with the EXACT same keys.",
    "- Translate values naturally for a friendly fitness coaching app UI; keep concise.",
    "- Keep ALL placeholders like {name}, {level}, {days}, {streak}, {percent} EXACTLY as-is.",
    "- Keep emojis, numbers, and newline characters intact.",
    "- Do NOT translate brand/proper names: Kaify Ai, Kai, Alex, Maya, Leo, Freezie, Paddle.",
    "- Keep the product shop label as Market when it is the nav/shop title.",
    "- Preserve leading/trailing spaces if present.",
    "",
    "JSON to translate:",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const backoff = attempt * 2000;
      console.warn(
        `  retry ${attempt} after error: ${err.message} (waiting ${backoff}ms)`,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function retranslateLocale(code, source, prefixes, dry) {
  const langName = LOCALE_NAMES[code];
  if (!langName) {
    console.warn(`skip ${code}: no language name mapping`);
    return { changed: 0, remaining: 0 };
  }
  const target = readJson(code);
  const identical = Object.keys(source).filter((k) => {
    if (target[k] !== source[k]) return false;
    if (shouldKeepIdentical(source[k])) return false;
    if (prefixes.length > 0 && !prefixes.some((p) => k.startsWith(p))) {
      return false;
    }
    return true;
  });

  if (identical.length === 0) {
    console.log(`✓ ${code} (${langName}): no EN-identical keys to translate`);
    return { changed: 0, remaining: 0 };
  }

  console.log(
    `… ${code} (${langName}): ${identical.length} EN-identical key(s)${dry ? " [dry]" : ""}`,
  );
  if (dry) return { changed: 0, remaining: identical.length };

  const entries = identical.map((k) => [k, source[k]]);
  let changed = 0;
  for (const part of chunk(entries, CHUNK_SIZE)) {
    const translated = await translateChunk(part, langName);
    for (const [k, enVal] of part) {
      const next = translated[k];
      if (typeof next === "string" && next.trim() && next !== enVal) {
        target[k] = next;
        changed++;
      }
    }
    process.stdout.write(`  · ${changed}/${identical.length}\r`);
  }
  writeJson(code, source, target);
  const remaining = Object.keys(source).filter(
    (k) =>
      target[k] === source[k] &&
      !shouldKeepIdentical(source[k]) &&
      (prefixes.length === 0 || prefixes.some((p) => k.startsWith(p))),
  ).length;
  console.log(
    `  → wrote ${code}.json (changed ${changed}, still-identical ${remaining})`,
  );
  return { changed, remaining };
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const source = readJson(SOURCE);
  const allCodes = readdirSync(LANG_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((c) => c !== SOURCE && c !== "zh" && c !== "tr");

  let targets = allCodes;
  const localeArg = args.indexOf("--locale");
  const onlyArg = args.indexOf("--only");
  const prefixArg = args.indexOf("--prefix");
  if (localeArg !== -1 && args[localeArg + 1]) {
    targets = [args[localeArg + 1]];
  } else if (onlyArg !== -1 && args[onlyArg + 1]) {
    const set = new Set(args[onlyArg + 1].split(","));
    targets = allCodes.filter((c) => set.has(c));
  }

  const prefixes =
    prefixArg !== -1 && args[prefixArg + 1]
      ? args[prefixArg + 1].split(",").filter(Boolean)
      : [];

  console.log(`Source: en.json (${Object.keys(source).length} keys)`);
  console.log(
    `Targets: ${targets.length} locale(s)${dry ? " [dry run]" : ""}${
      prefixes.length ? ` prefixes=${prefixes.join("|")}` : ""
    }\n`,
  );

  let changedTotal = 0;
  let fail = 0;
  for (const code of targets) {
    try {
      const result = await retranslateLocale(code, source, prefixes, dry);
      changedTotal += result.changed;
    } catch (err) {
      console.error(`✗ ${code}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone. Changed ${changedTotal} string(s). Failures: ${fail}.`);
  if (fail > 0) process.exit(1);
}

main();
