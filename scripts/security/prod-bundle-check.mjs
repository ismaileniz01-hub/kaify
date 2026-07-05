#!/usr/bin/env node
/**
 * Scans .next/static for obvious secret patterns (Faz 3.11).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIR = join(ROOT, ".next", "static");

/** @type {{ name: string; re: RegExp }[]} */
const PATTERNS = [
  {
    name: "supabase_service_role_env",
    re: /SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['"]?eyJ[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "csrf_secret_env",
    re: /CSRF_SECRET\s*[=:]\s*['"]?[A-Za-z0-9+/=_-]{16,}/,
  },
  {
    name: "long_jwt_triplet",
    re: /eyJ[A-Za-z0-9_-]{40,}\.eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{40,}/,
  },
  { name: "private_key_block", re: /BEGIN (RSA |OPENSSH )?PRIVATE KEY/ },
  { name: "aws_key", re: /AKIA[0-9A-Z]{16}/ },
];

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function walk(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|json|txt)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SCAN_DIR);
if (files.length === 0) {
  console.warn("[prod-bundle-check] .next/static not found — run npm run build first");
  process.exit(0);
}

/** @type {string[]} */
const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) hits.push(`${name} in ${file.replace(ROOT, "")}`);
  }
}

if (hits.length > 0) {
  console.error("[prod-bundle-check] potential secrets in client bundle:");
  for (const h of hits) console.error(" -", h);
  process.exit(1);
}

console.log("[prod-bundle-check] OK — no obvious secrets in", files.length, "files");
