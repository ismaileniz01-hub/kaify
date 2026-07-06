#!/usr/bin/env node
/**
 * Free motivation-quote translation via Google Translate (no API key).
 * Translates quote bodies only; author names stay in Latin script.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import translate from "google-translate-api-x";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QUOTES_DIR = join(ROOT, "lib", "motivation-quotes");
const CONCURRENCY = 12;

const GT_LANG = {
  de: "de", fr: "fr", es: "es", "es-mx": "es", "es-ar": "es", it: "it", pt: "pt",
  nl: "nl", ru: "ru", pl: "pl", ro: "ro", el: "el", sv: "sv", cs: "cs", hu: "hu",
  uk: "uk", da: "da", no: "no", fi: "fi", lt: "lt", lv: "lv", et: "et", sk: "sk",
  sl: "sl", hr: "hr", bg: "bg", sr: "sr", is: "is", mt: "mt", sq: "sq", bs: "bs",
  mk: "mk", be: "be", lb: "de", kk: "kk", uz: "uz", az: "az", ar: "ar", he: "he",
  fa: "fa", ur: "ur", af: "af", yo: "yo", hi: "hi", "zh-CN": "zh-CN", ja: "ja",
  ko: "ko", vi: "vi", th: "th", id: "id", ms: "ms", bn: "bn",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseQuote(quote) {
  const sep = " — ";
  const i = quote.lastIndexOf(sep);
  if (i === -1) return { body: quote, author: "" };
  return {
    body: quote.slice(0, i).replace(/^"|"$/g, ""),
    author: quote.slice(i + sep.length),
  };
}

function formatQuote(body, author) {
  const trimmed = body.trim();
  const quoted = trimmed.startsWith('"') || trimmed.startsWith("«") ? trimmed : `"${trimmed}"`;
  return author ? `${quoted} — ${author}` : quoted;
}

async function translateText(text, to) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await translate(text, { from: "en", to, forceTo: true });
      return res.text;
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(attempt * 800);
    }
  }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function translateLocale(code, source) {
  const to = GT_LANG[code];
  if (!to) throw new Error(`no GT mapping for ${code}`);

  const parsed = source.map(parseQuote);
  const bodies = await mapPool(parsed, CONCURRENCY, async (p) => translateText(p.body, to));
  const out = bodies.map((body, i) => formatQuote(body, parsed[i].author));

  writeFileSync(join(QUOTES_DIR, `${code}.json`), JSON.stringify(out, null, 2) + "\n", "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const source = JSON.parse(readFileSync(join(QUOTES_DIR, "en.json"), "utf8"));
  const allCodes = readdirSync(QUOTES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "en.json" && f !== "turkish-authors.json")
    .map((f) => f.replace(/\.json$/, ""))
    .filter((c) => c !== "tr");

  let targets = allCodes;
  const onlyArg = args.indexOf("--only");
  if (onlyArg !== -1 && args[onlyArg + 1]) {
    const set = new Set(args[onlyArg + 1].split(","));
    targets = allCodes.filter((c) => set.has(c));
  }
  if (!force) {
    targets = targets.filter((code) => {
      const current = JSON.parse(readFileSync(join(QUOTES_DIR, `${code}.json`), "utf8"));
      return current[0] === source[0];
    });
  }

  if (targets.length === 0) {
    console.log("All locales already translated.");
    return;
  }

  console.log(`Translating ${targets.length} locale(s)…\n`);
  const failed = [];
  for (const code of targets) {
    process.stdout.write(`… ${code}`);
    try {
      await translateLocale(code, source);
      console.log(" ✓");
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      failed.push(code);
    }
  }

  console.log(`\nDone. ${targets.length - failed.length}/${targets.length} ok`);
  if (failed.length) {
    console.error("Failed:", failed.join(", "));
    process.exit(1);
  }
}

main();
