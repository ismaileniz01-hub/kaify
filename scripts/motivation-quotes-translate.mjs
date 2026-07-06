#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QUOTES_DIR = join(ROOT, "lib", "motivation-quotes");
const MODEL = process.env.GEMINI_TRANSLATE_MODEL || "gemini-flash-lite-latest";
const CHUNK = 15;
const MAX_RETRIES = 6;
const LOCALE_DELAY_MS = Number(process.env.QUOTES_LOCALE_DELAY_MS || 8000);
const CHUNK_DELAY_MS = Number(process.env.QUOTES_CHUNK_DELAY_MS || 4000);

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
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    if (val && !process.env[m[1]]) process.env[m[1]] = val;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isStillEnglish(code, source) {
  const path = join(QUOTES_DIR, `${code}.json`);
  if (!existsSync(path)) return true;
  try {
    const current = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(current) || current.length !== source.length) return true;
    const englishHits = current.filter((q, i) => q === source[i]).length;
    return englishHits > source.length * 0.8;
  } catch {
    return true;
  }
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
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
    const err = new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return JSON.parse(text);
}

async function translateChunk(quotes, langName) {
  const prompt = [
    `Translate each fitness motivation quote into ${langName}.`,
    "Return a JSON array of strings with the SAME length and order.",
    "Keep format: \"Quote text.\" — Author Name",
    "Keep author names unchanged (Latin script).",
    "Quote body max 15 words. Natural inspiring tone for a fitness app.",
    "",
    JSON.stringify(quotes, null, 2),
  ].join("\n");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const out = await callGemini(prompt);
      if (!Array.isArray(out) || out.length !== quotes.length) {
        throw new Error(`Expected ${quotes.length}, got ${out?.length}`);
      }
      return out.map(String);
    } catch (err) {
      const is429 = err.status === 429;
      if (attempt === MAX_RETRIES) throw err;
      const backoff = is429 ? attempt * 45000 : attempt * 3000;
      console.warn(`  retry ${attempt}/${MAX_RETRIES} (${backoff}ms): ${err.message.slice(0, 120)}`);
      await sleep(backoff);
    }
  }
}

async function translateLocale(code, source) {
  const langName = LOCALE_NAMES[code];
  if (!langName) return { code, ok: false, error: "unknown locale" };

  console.log(`… ${code} (${langName})`);
  const out = [];
  for (let i = 0; i < source.length; i += CHUNK) {
    const translated = await translateChunk(source.slice(i, i + CHUNK), langName);
    out.push(...translated);
    if (i + CHUNK < source.length) await sleep(CHUNK_DELAY_MS);
  }
  writeFileSync(join(QUOTES_DIR, `${code}.json`), JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`  → ${code}.json`);
  return { code, ok: true };
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const resume = !args.includes("--force");
  const source = JSON.parse(readFileSync(join(QUOTES_DIR, "en.json"), "utf8"));
  let targets = Object.keys(LOCALE_NAMES).filter((c) => c !== "tr");
  const localeArg = args.indexOf("--locale");
  const onlyArg = args.indexOf("--only");
  if (localeArg !== -1 && args[localeArg + 1]) targets = [args[localeArg + 1]];
  else if (onlyArg !== -1 && args[onlyArg + 1]) {
    const set = new Set(args[onlyArg + 1].split(","));
    targets = targets.filter((c) => set.has(c));
  }

  const failed = [];
  let skipped = 0;
  for (const code of targets) {
    if (resume && !isStillEnglish(code, source)) {
      console.log(`✓ ${code}: already translated, skip`);
      skipped++;
      continue;
    }
    try {
      await translateLocale(code, source);
      await sleep(LOCALE_DELAY_MS);
    } catch (err) {
      console.error(`✗ ${code}: ${err.message.slice(0, 200)}`);
      failed.push(code);
    }
  }

  console.log(`\nDone. skipped=${skipped} failed=${failed.length}`);
  if (failed.length) {
    console.error(`Failed locales: ${failed.join(", ")}`);
    process.exit(1);
  }
}

main();
