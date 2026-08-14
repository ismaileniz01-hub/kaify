#!/usr/bin/env node
/** Fast critical-only retranslate for leftover priority locales. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANG = join(ROOT, "lib", "lang");
const en = JSON.parse(readFileSync(join(LANG, "en.json"), "utf8"));

const GTX = {
  pt: "pt",
  ru: "ru",
  ja: "ja",
  "zh-CN": "zh-CN",
  nl: "nl",
  pl: "pl",
  ko: "ko",
};

const prefixes = [
  "landing.hero.",
  "landing.about.",
  "pricing.hero.",
  "pricing.final.",
  "a11y.",
  "error.global.",
];
const exact = new Set(["common.loading", "common.retry", "nav.home", "nav.settings"]);
const allow = new Set(["Kaify Ai", "Kai", "Market", "Freezie", "Paddle"]);

function keep(v) {
  const t = v.trim();
  if (allow.has(t)) return true;
  return /^[A-Z0-9+._\-/]{1,12}$/.test(t);
}

function protect(text) {
  const map = [];
  const p = text.replace(/\{[a-zA-Z0-9_]+\}/g, (m) => {
    const tok = `__PH_${map.length}__`;
    map.push(m);
    return tok;
  });
  return { p, map };
}

function restore(text, map) {
  let o = text;
  map.forEach((ph, i) => {
    o = o.split(`__PH_${i}__`).join(ph);
  });
  return o;
}

async function translate(text, tl) {
  const { p, map } = protect(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    encodeURIComponent(tl) +
    "&dt=t&q=" +
    encodeURIComponent(p);
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  const res = await fetch(url, { signal: ac.signal });
  clearTimeout(to);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const joined = (data?.[0] ?? []).map((r) => r?.[0] ?? "").join("");
  if (!joined) throw new Error("empty");
  return restore(joined, map);
}

function writeOrdered(code, dict) {
  const ordered = {};
  for (const k of Object.keys(en)) {
    if (dict[k] !== undefined) ordered[k] = dict[k];
  }
  for (const k of Object.keys(dict)) {
    if (ordered[k] === undefined) ordered[k] = dict[k];
  }
  writeFileSync(join(LANG, `${code}.json`), JSON.stringify(ordered, null, 2) + "\n");
}

async function one(code) {
  const dict = JSON.parse(readFileSync(join(LANG, `${code}.json`), "utf8"));
  const keys = Object.keys(en).filter(
    (k) =>
      (exact.has(k) || prefixes.some((p) => k.startsWith(p))) &&
      dict[k] === en[k] &&
      !keep(en[k]),
  );
  console.log(`${code}: ${keys.length} remaining`);
  let ok = 0;
  let fail = 0;
  let i = 0;
  const conc = 8;
  async function worker() {
    while (i < keys.length) {
      const idx = i++;
      const k = keys[idx];
      try {
        const next = await translate(en[k], GTX[code]);
        if (next && next !== en[k]) {
          dict[k] = next;
          ok++;
        }
      } catch {
        fail++;
      }
    }
  }
  await Promise.all(Array.from({ length: conc }, () => worker()));
  writeOrdered(code, dict);
  console.log(`${code}: ok=${ok} fail=${fail}`);
}

for (const code of Object.keys(GTX)) {
  await one(code);
}
console.log("DONE");
