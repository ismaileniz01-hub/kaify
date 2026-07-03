#!/usr/bin/env node
/**
 * i18n-fill — completes every locale file under lib/lang/ to full parity with
 * the English source of truth (en.json), translating ONLY the missing keys via
 * the Gemini API. Existing translations are never overwritten, so it is safe to
 * re-run after adding new keys to en.json.
 *
 * Usage:
 *   node scripts/i18n-fill.mjs                # fill all locales
 *   node scripts/i18n-fill.mjs --locale es    # single locale
 *   node scripts/i18n-fill.mjs --only es,de,fr,pt,ru,ar,hi,zh-CN   # subset
 *   node scripts/i18n-fill.mjs --dry          # report gaps, do not write
 *
 * Requires GEMINI_API_KEY (read from environment or .env.local).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LANG_DIR = join(ROOT, "lib", "lang");
const SOURCE = "en";

const MODEL = process.env.GEMINI_TRANSLATE_MODEL || "gemini-2.0-flash";
const CHUNK_SIZE = 40;
const MAX_RETRIES = 3;

/** Human-readable language names for the translation prompt. */
const LOCALE_NAMES = {
  tr: "Turkish", de: "German", fr: "French", es: "Spanish (Spain)",
  "es-mx": "Spanish (Mexico)", "es-ar": "Spanish (Argentina)", it: "Italian",
  pt: "Portuguese", nl: "Dutch", ru: "Russian", pl: "Polish", ro: "Romanian",
  el: "Greek", sv: "Swedish", cs: "Czech", hu: "Hungarian", uk: "Ukrainian",
  da: "Danish", no: "Norwegian", fi: "Finnish", lt: "Lithuanian", lv: "Latvian",
  et: "Estonian", sk: "Slovak", sl: "Slovenian", hr: "Croatian", bg: "Bulgarian",
  sr: "Serbian", is: "Icelandic", mt: "Maltese", sq: "Albanian", bs: "Bosnian",
  mk: "Macedonian", be: "Belarusian", lb: "Luxembourgish", kk: "Kazakh",
  uz: "Uzbek", az: "Azerbaijani", ar: "Arabic", he: "Hebrew", fa: "Persian",
  ur: "Urdu", af: "Afrikaans", yo: "Yoruba", hi: "Hindi",
  "zh-CN": "Simplified Chinese", ja: "Japanese", ko: "Korean", vi: "Vietnamese",
  th: "Thai", id: "Indonesian", ms: "Malay", bn: "Bengali",
};

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
  // Write keys in the SAME order as en.json for stable, reviewable diffs.
  const ordered = {};
  for (const key of Object.keys(sourceOrder)) {
    if (dict[key] !== undefined) ordered[key] = dict[key];
  }
  // Preserve any extra keys not present in the source at the end.
  for (const key of Object.keys(dict)) {
    if (ordered[key] === undefined) ordered[key] = dict[key];
  }
  writeFileSync(
    join(LANG_DIR, `${code}.json`),
    JSON.stringify(ordered, null, 2) + "\n",
    "utf8",
  );
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
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
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
    "- Translate values naturally for a friendly fitness app UI; keep it concise.",
    "- Keep ALL placeholders like {name}, {level}, {days}, {streak}, {percent} EXACTLY as-is.",
    "- Keep emojis, numbers, and Markdown/newline characters (\\n) intact.",
    "- Do NOT translate brand/proper names: K.AIFY, Kai, Alex, Maya, Leo.",
    "- Preserve leading/trailing spaces if present.",
    "",
    "JSON to translate:",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const out = await callGemini(prompt);
      return out;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const backoff = attempt * 1500;
      console.warn(`  retry ${attempt} after error: ${err.message} (waiting ${backoff}ms)`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fillLocale(code, source, dry) {
  const langName = LOCALE_NAMES[code];
  if (!langName) {
    console.warn(`skip ${code}: no language name mapping`);
    return;
  }
  const target = readJson(code);
  const missing = Object.keys(source).filter((k) => target[k] === undefined);

  if (missing.length === 0) {
    console.log(`✓ ${code} (${langName}): complete`);
    return;
  }
  console.log(`… ${code} (${langName}): ${missing.length} missing key(s)`);
  if (dry) return;

  const entries = missing.map((k) => [k, source[k]]);
  for (const part of chunk(entries, CHUNK_SIZE)) {
    const translated = await translateChunk(part, langName);
    for (const [k] of part) {
      if (typeof translated[k] === "string") {
        target[k] = translated[k];
      } else {
        target[k] = source[k]; // fall back to English if the model dropped a key
      }
    }
  }
  writeJson(code, source, target);
  console.log(`  → wrote ${code}.json (${Object.keys(target).length} keys)`);
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");

  const source = readJson(SOURCE);
  const allCodes = readdirSync(LANG_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((c) => c !== SOURCE);

  let targets = allCodes;
  const localeArg = args.indexOf("--locale");
  const onlyArg = args.indexOf("--only");
  if (localeArg !== -1 && args[localeArg + 1]) {
    targets = [args[localeArg + 1]];
  } else if (onlyArg !== -1 && args[onlyArg + 1]) {
    const set = new Set(args[onlyArg + 1].split(","));
    targets = allCodes.filter((c) => set.has(c));
  }

  console.log(`Source: en.json (${Object.keys(source).length} keys)`);
  console.log(`Targets: ${targets.length} locale(s)${dry ? " [dry run]" : ""}\n`);

  for (const code of targets) {
    try {
      await fillLocale(code, source, dry);
    } catch (err) {
      console.error(`✗ ${code}: ${err.message}`);
    }
  }
  console.log("\nDone.");
}

main();
