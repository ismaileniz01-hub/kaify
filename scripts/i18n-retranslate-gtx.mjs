#!/usr/bin/env node
/**
 * i18n-retranslate-gtx — re-translates EN-identical locale values via the
 * public Google Translate gtx endpoint (no API key). Use when Gemini quota
 * is exhausted. Existing non-English translations are never overwritten.
 *
 * Usage:
 *   node scripts/i18n-retranslate-gtx.mjs --only de,fr --prefix landing.,pricing.
 *   node scripts/i18n-retranslate-gtx.mjs --only de --dry
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LANG_DIR = join(ROOT, "lib", "lang");
const SOURCE = "en";
const DELAY_MS = 120;

const GTX_TARGET = {
  de: "de",
  fr: "fr",
  es: "es",
  "es-mx": "es",
  "es-ar": "es",
  it: "it",
  pt: "pt",
  nl: "nl",
  ru: "ru",
  pl: "pl",
  ro: "ro",
  el: "el",
  sv: "sv",
  cs: "cs",
  hu: "hu",
  uk: "uk",
  da: "da",
  no: "no",
  fi: "fi",
  lt: "lt",
  lv: "lv",
  et: "et",
  sk: "sk",
  sl: "sl",
  hr: "hr",
  bg: "bg",
  sr: "sr",
  is: "is",
  mt: "mt",
  sq: "sq",
  bs: "bs",
  mk: "mk",
  be: "be",
  lb: "lb",
  kk: "kk",
  uz: "uz",
  az: "az",
  ar: "ar",
  he: "iw",
  fa: "fa",
  ur: "ur",
  af: "af",
  yo: "yo",
  hi: "hi",
  "zh-CN": "zh-CN",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  th: "th",
  id: "id",
  ms: "ms",
  bn: "bn",
};

const ALLOW_IDENTICAL = new Set([
  "K.AIFY",
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function protectPlaceholders(text) {
  const map = [];
  const protectedText = text.replace(/\{[a-zA-Z0-9_]+\}/g, (m) => {
    const token = `__PH_${map.length}__`;
    map.push(m);
    return token;
  });
  return { protectedText, map };
}

function restorePlaceholders(text, map) {
  let out = text;
  map.forEach((ph, i) => {
    out = out.split(`__PH_${i}__`).join(ph);
    // Some engines mangle underscores
    out = out.split(`__PH ${i}__`).join(ph);
  });
  return out;
}

async function gtxTranslate(text, target) {
  const { protectedText, map } = protectPlaceholders(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    encodeURIComponent(target) +
    "&dt=t&q=" +
    encodeURIComponent(protectedText);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`gtx HTTP ${res.status}`);
  }
  const data = await res.json();
  const joined = (data?.[0] ?? []).map((row) => row?.[0] ?? "").join("");
  if (!joined) throw new Error("empty gtx response");
  return restorePlaceholders(joined, map);
}

async function retranslateLocale(code, source, prefixes, dry) {
  const targetLang = GTX_TARGET[code];
  if (!targetLang) {
    console.warn(`skip ${code}: no gtx mapping`);
    return { changed: 0 };
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
    console.log(`✓ ${code}: nothing to translate`);
    return { changed: 0 };
  }

  console.log(
    `… ${code} → ${targetLang}: ${identical.length} key(s)${dry ? " [dry]" : ""}`,
  );
  if (dry) return { changed: identical.length };

  let changed = 0;
  let failures = 0;
  for (let i = 0; i < identical.length; i++) {
    const key = identical[i];
    const enVal = source[key];
    try {
      const next = await gtxTranslate(enVal, targetLang);
      if (next && next.trim() && next !== enVal) {
        target[key] = next;
        changed++;
      }
    } catch (err) {
      failures++;
      if (failures <= 5) {
        console.warn(`  ! ${key}: ${err.message}`);
      }
      await sleep(800);
    }
    if ((i + 1) % 25 === 0 || i + 1 === identical.length) {
      process.stdout.write(`  · ${i + 1}/${identical.length} (ok ${changed})\r`);
      writeJson(code, source, target);
    }
    await sleep(DELAY_MS);
  }
  writeJson(code, source, target);
  console.log(
    `  → ${code}.json changed ${changed}/${identical.length} (fail ${failures})`,
  );
  return { changed };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const source = readJson(SOURCE);
  const allCodes = readdirSync(LANG_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((c) => c !== SOURCE && c !== "zh" && c !== "tr");

  let targets = allCodes;
  const onlyArg = args.indexOf("--only");
  const prefixArg = args.indexOf("--prefix");
  if (onlyArg !== -1 && args[onlyArg + 1]) {
    const set = new Set(args[onlyArg + 1].split(","));
    targets = allCodes.filter((c) => set.has(c));
  }
  const prefixes =
    prefixArg !== -1 && args[prefixArg + 1]
      ? args[prefixArg + 1].split(",").filter(Boolean)
      : [];

  console.log(`Source keys: ${Object.keys(source).length}`);
  console.log(`Targets: ${targets.join(", ")}`);
  if (prefixes.length) console.log(`Prefixes: ${prefixes.join(", ")}`);
  console.log("");

  let changedTotal = 0;
  for (const code of targets) {
    const result = await retranslateLocale(code, source, prefixes, dry);
    changedTotal += result.changed;
  }
  console.log(`\nDone. Changed ${changedTotal} string(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
