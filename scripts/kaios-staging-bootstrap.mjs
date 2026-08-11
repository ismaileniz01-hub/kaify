#!/usr/bin/env node
/**
 * KAIOS staging bootstrap — creates synthetic users/JWTs/entitlement when
 * staging Supabase + provider secrets are already available in the environment
 * or gitignored `.env.local`.
 *
 * SAFETY:
 * - Refuses known production project ref unless KAIOS_ALLOW_PRODUCTION_LIVE=1
 *   (default: refuse).
 * - Never prints secrets/JWTs.
 * - Writes only presence flags + non-secret ids into kaios/live-evidence/.
 * - May write secrets into gitignored `.env.local` only.
 *
 * Usage:
 *   node scripts/kaios-staging-bootstrap.mjs
 */
import { createClient } from "@supabase/supabase-js";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = process.cwd();
const PROD_REF = "urnetodzvszmddzdazdj";
const EVIDENCE = join(ROOT, "kaios/live-evidence");

function loadDotEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = val;
    }
  }
}

function present(v) {
  const s = (v ?? "").trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  return !(
    lower.includes("your_") ||
    lower.includes("changeme") ||
    lower.includes("replace_me") ||
    lower.includes("_here")
  );
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function upsertEnvLocal(entries) {
  const path = join(ROOT, ".env.local");
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  for (const [key, value] of Object.entries(entries)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (re.test(text)) text = text.replace(re, line);
    else text = `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(path, text, { mode: 0o600 });
}

function syntheticEmail(tag) {
  const stamp = Date.now().toString(36);
  return `kaios.live.${tag}.${stamp}@example.invalid`;
}

function strongPassword() {
  return `Kl_${randomBytes(24).toString("base64url")}!9`;
}

loadDotEnvLocal();
mkdirSync(EVIDENCE, { recursive: true });

const report = {
  capturedAt: new Date().toISOString(),
  status: "STARTED",
  productionGuard: "active",
  steps: [],
};

function step(name, ok, detail = {}) {
  report.steps.push({ name, ok, ...detail });
  console.log(`${ok ? "OK" : "FAIL"}  ${name}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = projectRefFromUrl(url ?? "");

const presence = {
  DEEPSEEK_API_KEY: present(process.env.DEEPSEEK_API_KEY) ? "PRESENT" : "MISSING",
  GEMINI_API_KEY: present(process.env.GEMINI_API_KEY) ? "PRESENT" : "MISSING",
  NEXT_PUBLIC_SUPABASE_URL: present(url) ? "PRESENT" : "MISSING",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: present(anon) ? "PRESENT" : "MISSING",
  SUPABASE_SERVICE_ROLE_KEY: present(service) ? "PRESENT" : "MISSING",
};
report.presence = presence;
writeFileSync(
  join(EVIDENCE, "bootstrap-presence.json"),
  JSON.stringify({ capturedAt: report.capturedAt, presence }, null, 2),
);

if (!present(url) || !present(anon) || !present(service)) {
  report.status = "BLOCKED_MISSING_SUPABASE";
  writeFileSync(join(EVIDENCE, "bootstrap-status.json"), JSON.stringify(report, null, 2));
  console.error("Bootstrap blocked: Supabase staging trio missing.");
  process.exit(0);
}

if (ref === PROD_REF && process.env.KAIOS_ALLOW_PRODUCTION_LIVE !== "1") {
  report.status = "BLOCKED_PRODUCTION_ENVIRONMENT";
  report.projectRefHostOnly = ref;
  report.reason =
    "Supabase URL resolves to known production project ref. Refusing synthetic user/data creation.";
  writeFileSync(join(EVIDENCE, "bootstrap-status.json"), JSON.stringify(report, null, 2));
  console.error("BLOCKED_PRODUCTION_ENVIRONMENT");
  process.exit(2);
}

step("production_guard_passed", true, { projectRefHostOnly: ref || "unknown" });

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(tag) {
  const email = syntheticEmail(tag);
  const password = strongPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      kaios_live: true,
      kaios_tag: tag,
      display_name: `KAIOS Live ${tag.toUpperCase()}`,
    },
  });
  if (error) throw error;
  const userId = data.user.id;

  // Profile entitlement fields — best-effort against current schema.
  const profilePatch = {
    id: userId,
    display_name: `KAIOS Live ${tag.toUpperCase()}`,
  };
  if (tag === "council" || tag === "a") {
    profilePatch.tier = "premium";
    profilePatch.team_chat_unlocked = true;
  }
  const { error: profileErr } = await admin.from("profiles").upsert(profilePatch);
  if (profileErr) {
    // Non-fatal if columns differ; entitlement verified later.
    step(`profile_upsert_${tag}`, false, { error: profileErr.message });
  } else {
    step(`profile_upsert_${tag}`, true);
  }

  const userClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sessionData, error: signErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) throw signErr;
  const jwt = sessionData.session?.access_token;
  if (!jwt) throw new Error(`No JWT for ${tag}`);
  if (sessionData.user?.id !== userId) {
    throw new Error(`JWT subject mismatch for ${tag}`);
  }

  return { userId, email, jwt };
}

try {
  const userA = await ensureUser("a");
  const userB = await ensureUser("b");
  step("users_created", true, {
    userAIdSuffix: userA.userId.slice(-8),
    userBIdSuffix: userB.userId.slice(-8),
  });

  // Council entitlement verification via same gate as app when possible.
  let councilOk = false;
  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("tier, team_chat_unlocked")
      .eq("id", userA.userId)
      .maybeSingle();
    councilOk = Boolean(
      prof &&
        (prof.team_chat_unlocked === true ||
          prof.tier === "pro" ||
          prof.tier === "premium"),
    );
  } catch {
    councilOk = false;
  }
  step("council_entitlement", councilOk);

  upsertEnvLocal({
    KAIOS_LIVE_USER_A_ID: userA.userId,
    KAIOS_LIVE_USER_B_ID: userB.userId,
    KAIOS_LIVE_USER_A_JWT: userA.jwt,
    KAIOS_LIVE_USER_B_JWT: userB.jwt,
    KAIOS_LIVE_COUNCIL_USER_ID: userA.userId,
    KAIOS_RUNTIME: "true",
  });
  step("env_local_written", true, { note: "gitignored .env.local only; secrets not printed" });

  report.status = "COMPLETE";
  report.sanitized = {
    userAIdSuffix: userA.userId.slice(-8),
    userBIdSuffix: userB.userId.slice(-8),
    councilUser: "A",
    councilEntitlementVerified: councilOk,
    deepseek: presence.DEEPSEEK_API_KEY,
    gemini: presence.GEMINI_API_KEY,
  };
} catch (error) {
  report.status = "FAILED";
  report.error = error instanceof Error ? error.message : String(error);
  step("bootstrap_failed", false, { error: report.error });
}

writeFileSync(join(EVIDENCE, "bootstrap-status.json"), JSON.stringify(report, null, 2));
process.exit(report.status === "COMPLETE" ? 0 : 1);
