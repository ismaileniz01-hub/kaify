#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_ID = "prj_ElGY2Q2RQeL6B3pReicHdaDO40Cg";
const TEAM_ID = "team_bKFWsBvVG6gv1kpjeW1pQyup";

function load(key) {
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
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim();
  const authPaths = [
    join(homedir(), "AppData/Roaming/com.vercel.cli/auth.json"),
    join(homedir(), ".local/share/com.vercel.cli/auth.json"),
    join(homedir(), ".config/vercel/auth.json"),
  ];
  for (const p of authPaths) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      if (j.token || j.accessToken) return j.token || j.accessToken;
    } catch {
      /* ignore */
    }
  }
  return null;
}

const token = findToken();
if (!token) {
  console.error("NO_TOKEN");
  process.exit(2);
}

const cron = load("CRON_SECRET");
const hub = load("ADMIN_HUB_SECRET");
if (!cron || cron.length < 32 || !hub || hub.length < 32) {
  console.error("LOCAL_SECRETS_WEAK");
  process.exit(1);
}

console.error(`token_ok cron_len=${cron.length} hub_len=${hub.length}`);

async function upsert(key, value) {
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const list = await listRes.json();
  if (!listRes.ok) {
    console.error(`list_fail ${listRes.status}`, list);
    process.exit(1);
  }
  const existing = (list.envs || []).filter((e) => e.key === key);
  for (const e of existing) {
    const del = await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${e.id}?teamId=${TEAM_ID}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.error(`deleted ${key} ${e.id} status=${del.status}`);
  }
  const create = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type: "sensitive",
        target: ["production", "preview"],
      }),
    }
  );
  const body = await create.json();
  console.error(
    `create ${key} status=${create.status} err=${body.error?.message || "none"}`
  );
  if (!create.ok) process.exit(1);
}

await upsert("CRON_SECRET", cron);
await upsert("ADMIN_HUB_SECRET", hub);
console.log("API_SET_OK");
