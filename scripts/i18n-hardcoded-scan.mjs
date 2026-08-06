#!/usr/bin/env node
/**
 * Scans TSX for likely hardcoded English UI strings (aria-label / placeholder /
 * visible text) that are not routed through t(). Informational for CI.
 *
 * Usage: node scripts/i18n-hardcoded-scan.mjs
 * Exit 1 only when --strict and findings remain outside allowlist.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["app", "components"];
const ALLOW_FILES = [
  "components/legal/PrivacyPolicyContent.tsx",
  "lib/legal/",
  "scripts/",
];
const PATTERN =
  /(aria-label|placeholder)=["']([A-Za-z][^"']{2,})["']|>\s*(Loading|Retry|Continue|Sign in|Sign up|Cancel|Close|Save|Delete|Submit|Something went wrong)[^<]*</g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const strict = process.argv.includes("--strict");
const findings = [];

for (const root of TARGETS) {
  const base = join(ROOT, root);
  for (const file of walk(base)) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOW_FILES.some((a) => rel.startsWith(a) || rel === a)) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(PATTERN)) {
      findings.push(`${rel}: ${match[0].slice(0, 80)}`);
    }
  }
}

if (findings.length === 0) {
  console.log("✓ No hardcoded EN UI candidates found.");
  process.exit(0);
}

console.log(`Found ${findings.length} candidate(s):\n`);
for (const line of findings) console.log(` - ${line}`);
if (strict) process.exit(1);
process.exit(0);
