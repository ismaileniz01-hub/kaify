#!/usr/bin/env node
/**
 * Enable HaveIBeenPwned leaked-password protection via Management API.
 * Looks for SUPABASE_ACCESS_TOKEN in env / .env.local.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REF = "urnetodzvszmddzdazdj";

function load(key) {
  if (process.env[key]?.trim()) return process.env[key].trim();
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.startsWith(`${key}=`)) continue;
    let v = line.slice(key.length + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v || null;
  }
  return null;
}

function findToken() {
  const direct =
    load("SUPABASE_ACCESS_TOKEN") ||
    load("SUPABASE_MANAGEMENT_TOKEN") ||
    process.env.SUPABASE_ACCESS_TOKEN;
  if (direct) return direct;

  // Supabase CLI credentials (best-effort)
  const candidates = [
    join(homedir(), "AppData/Roaming/supabase/access-token"),
    join(homedir(), ".supabase/access-token"),
    join(homedir(), ".config/supabase/access-token"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const t = readFileSync(p, "utf8").trim();
    if (t) return t;
  }
  return null;
}

const token = findToken();
if (!token) {
  console.log(JSON.stringify({ ok: false, reason: "NO_TOKEN" }));
  process.exit(2);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password_hibp_enabled: true,
      password_min_length: 8,
    }),
  }
);
const body = await res.json().catch(() => ({}));
console.log(
  JSON.stringify({
    ok: res.ok,
    status: res.status,
    hibp: body.password_hibp_enabled ?? null,
    min_length: body.password_min_length ?? null,
    error: body.message || body.error || null,
  })
);
process.exit(res.ok ? 0 : 1);
