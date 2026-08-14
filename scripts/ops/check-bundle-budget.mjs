#!/usr/bin/env node
/**
 * Post-build bundle budget gate (Faz 4).
 * Fails CI when core shared / largest chunk exceed budgets.
 *
 * Budgets sit slightly above the Wave 5 measured baseline so regressions trip
 * the gate without being brittle to chunk hash renames. Never raise these.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const CHUNKS = path.join(ROOT, ".next", "static", "chunks");

/** @type {{ name: string; maxKb: number; getKb: (files: FileStat[]) => number }} */
const BUDGETS = [
  {
    name: "largest-client-chunk-gzip",
    maxKb: 135,
    getKb: (files) => Math.max(0, ...files.map((f) => f.gzKb)),
  },
  {
    name: "core-shared-gzip (framework+polyfills+main+top shared)",
    maxKb: 350,
    getKb: (files) => {
      const sorted = [...files].sort((a, b) => b.gzKb - a.gzKb);
      const named = sorted.filter(
        (f) =>
          f.name.startsWith("framework-") ||
          f.name.startsWith("polyfills-") ||
          f.name.startsWith("main-") ||
          /^[0-9]+-/.test(f.name),
      );
      const pick = named.slice(0, 4);
      return pick.reduce((s, f) => s + f.gzKb, 0);
    },
  },
  {
    name: "middleware-edge-gzip",
    maxKb: 125,
    getKb: () => {
      const mw = path.join(ROOT, ".next", "server", "middleware.js");
      if (!fs.existsSync(mw)) return 0;
      return Math.round(zlib.gzipSync(fs.readFileSync(mw)).length / 1024);
    },
  },
];

/**
 * @typedef {{ name: string; rawKb: number; gzKb: number }} FileStat
 */

function walkJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, acc);
    else if (entry.name.endsWith(".js")) acc.push(full);
  }
  return acc;
}

function main() {
  if (!fs.existsSync(CHUNKS)) {
    console.error("Missing .next/static/chunks — run `npm run build` first.");
    process.exit(1);
  }

  /** @type {FileStat[]} */
  const files = walkJs(CHUNKS).map((full) => {
    const buf = fs.readFileSync(full);
    return {
      name: path.relative(CHUNKS, full).replace(/\\/g, "/"),
      rawKb: Math.round(buf.length / 1024),
      gzKb: Math.round(zlib.gzipSync(buf).length / 1024),
    };
  });

  console.log(`Scanned ${files.length} client chunks under .next/static/chunks`);
  const top = [...files].sort((a, b) => b.gzKb - a.gzKb).slice(0, 8);
  for (const f of top) {
    console.log(`  ${String(f.gzKb).padStart(4)} KB gz  ${f.name}`);
  }

  let failed = false;
  for (const budget of BUDGETS) {
    const actual = budget.getKb(files);
    const ok = actual <= budget.maxKb;
    const mark = ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${budget.name}: ${actual} KB (max ${budget.maxKb})`);
    if (!ok) failed = true;
  }

  if (failed) {
    console.error("\nBundle budget exceeded. See docs/operations/perf-faz4-evidence.md");
    process.exit(1);
  }
  console.log("\nAll bundle budgets OK.");
}

main();
