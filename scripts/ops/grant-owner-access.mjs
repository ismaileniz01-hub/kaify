#!/usr/bin/env node
/**
 * Grants an existing account a paid tier and the admin role.
 * Never creates users: a typo'd email must fail instead of minting a new admin.
 *
 * Usage:
 *   node scripts/ops/grant-owner-access.mjs <email> [tier]
 *   tier: essential | pro | premium_max (default premium_max)
 *
 * The admin hub additionally requires ADMIN_EMAIL to match this email.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPIRES_AT = "2099-12-31T23:59:59.000Z";
const TIERS = new Set(["essential", "pro", "premium_max"]);

function load(key) {
  if (process.env[key]?.trim()) return process.env[key].trim();
  for (const file of [".env.local", ".env.vercel.prod.tmp"]) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (!line.startsWith(`${key}=`)) continue;
      let v = line.slice(key.length + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (v && v !== "[SENSITIVE]") return v;
    }
  }
  return null;
}

function fail(step, error) {
  console.error(`FAILED ${step}: ${error?.message || String(error)}`);
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();
const tier = (process.argv[3] || "premium_max").trim().toLowerCase();
if (!email || !email.includes("@")) fail("args", new Error("Usage: <email> [tier]"));
if (!TIERS.has(tier)) fail("args", new Error("tier must be essential, pro, or premium_max"));

const url = load("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = load("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceRoleKey) {
  fail("env", new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"));
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let user = null;
for (let page = 1; page <= 50 && !user; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail("listUsers", error);
  user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}
if (!user) fail("findUser", new Error(`No account for ${email}; sign in once first.`));

const subscribed = await admin.rpc("apply_subscription", {
  p_user_id: user.id,
  p_tier: tier,
  p_billing_cycle: "yearly",
  p_expires_at: EXPIRES_AT,
});
if (subscribed.error) fail("apply_subscription", subscribed.error);

const promoted = await admin.from("profiles").update({ role: "admin" }).eq("id", user.id);
if (promoted.error) fail("setAdminRole", promoted.error);

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("role, tier, tier_started_at, tier_expires_at, onboarding_status")
  .eq("id", user.id)
  .single();
if (profileError) fail("verify", profileError);

const adminEmail = load("ADMIN_EMAIL")?.toLowerCase() ?? null;
console.log(
  JSON.stringify(
    {
      email,
      userId: user.id,
      role: profile.role,
      tier: profile.tier,
      tierStartedAt: profile.tier_started_at,
      tierExpiresAt: profile.tier_expires_at,
      onboardingStatus: profile.onboarding_status,
      adminEmailMatches: adminEmail === null ? "ADMIN_EMAIL not set locally" : adminEmail === email,
    },
    null,
    2,
  ),
);
