#!/usr/bin/env node
/**
 * Creates / refreshes the Google Play reviewer account.
 *
 * Prints credentials once to stdout. Does not write the password to disk.
 *
 * Usage:
 *   node scripts/ops/provision-play-review-account.mjs
 *
 * Optional env:
 *   PLAY_REVIEW_EMAIL     (default play-review@kaifyai.org)
 *   PLAY_REVIEW_PASSWORD  (alphanumeric, min 8; generated only for a new user)
 *   PLAY_REVIEW_TIER      (default essential)
 *   PLAY_REVIEW_ROTATE=1  force a new password even if the user already exists
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_EMAIL = "play-review@kaifyai.org";
const DEFAULT_TIER = "essential";
const EXPIRES_AT = "2099-12-31T23:59:59.000Z";
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

function generatePassword() {
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

function fail(step, error) {
  const message = error?.message || String(error);
  console.error(`FAILED ${step}: ${message}`);
  process.exit(1);
}

const url = load("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = load("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = load("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !anonKey || !serviceRoleKey) {
  fail(
    "env",
    new Error(
      "Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
    ),
  );
}

const email = (load("PLAY_REVIEW_EMAIL") || DEFAULT_EMAIL).toLowerCase();
const requestedTier = (load("PLAY_REVIEW_TIER") || DEFAULT_TIER).toLowerCase();
const allowedTiers = new Set(["essential", "pro", "premium_max"]);
if (!allowedTiers.has(requestedTier)) {
  fail("tier", new Error("PLAY_REVIEW_TIER must be essential, pro, or premium_max"));
}
const rotate = load("PLAY_REVIEW_ROTATE") === "1";
const suppliedPassword = load("PLAY_REVIEW_PASSWORD");
if (suppliedPassword && (suppliedPassword.length < 8 || /[^A-Za-z0-9]/.test(suppliedPassword))) {
  fail(
    "password",
    new Error("PLAY_REVIEW_PASSWORD must be alphanumeric and at least 8 characters"),
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId = null;
let password = suppliedPassword;
let passwordRotated = false;
const existing = await findUserByEmail(admin, email);

if (!existing) {
  password = suppliedPassword || generatePassword();
  if (password.length < 8 || /[^A-Za-z0-9]/.test(password)) {
    fail(
      "password",
      new Error("PLAY_REVIEW_PASSWORD must be alphanumeric and at least 8 characters"),
    );
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Play Reviewer" },
  });
  if (!created.data.user) fail("createUser", created.error);
  userId = created.data.user.id;
  passwordRotated = true;
} else {
  userId = existing.id;
  if (rotate || suppliedPassword) {
    password = suppliedPassword || generatePassword();
    const updated = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updated.error) fail("updateUser", updated.error);
    passwordRotated = true;
  } else {
    const confirmed = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (confirmed.error) fail("confirmUser", confirmed.error);
  }
}

const userClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let passwordLoginOk = false;
if (password) {
  const signedIn = await userClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) fail("signIn", signedIn.error);
  passwordLoginOk = true;
}

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("onboarding_status, tier")
  .eq("id", userId)
  .single();
if (profileError) fail("loadProfile", profileError);

if (profile.onboarding_status !== "ACTIVE") {
  if (!passwordLoginOk) {
    fail(
      "complete_onboarding",
      new Error("Account exists but is not onboarded. Set PLAY_REVIEW_PASSWORD to finish setup."),
    );
  }
  const onboarded = await userClient.rpc("complete_onboarding", {
    p_display_name: "Play Reviewer",
    p_gender: "prefer_not_to_say",
    p_height_cm: 175,
    p_weight_kg: 75,
    p_experience_level: "beginner",
    p_is_natural: true,
    p_bio: "Google Play review account",
    p_locale: "en",
    p_birth_date: "1990-01-15",
    p_primary_goal: "stay_fit",
    p_activity_level: "moderately_active",
    p_training_days_per_week: 3,
    p_dietary_preference: "omnivore",
    p_allergies: "",
    p_disliked_foods: "",
    p_health_conditions: "",
    p_country_code: "US",
  });
  if (onboarded.error && !/already completed/i.test(onboarded.error.message)) {
    fail("complete_onboarding", onboarded.error);
  }
}

const subscribed = await admin.rpc("apply_subscription", {
  p_user_id: userId,
  p_tier: requestedTier,
  p_billing_cycle: "yearly",
  p_expires_at: EXPIRES_AT,
});
if (subscribed.error) fail("apply_subscription", subscribed.error);

const unlocked = await admin
  .from("profiles")
  .update({
    team_chat_unlocked: true,
    team_chat_unlocked_at: new Date().toISOString(),
    locale: "en",
  })
  .eq("id", userId);
if (unlocked.error) fail("unlockTeamChat", unlocked.error);

const consentRows = [
  { type: "terms_privacy", version: "2.0.0+2026-08-22" },
  { type: "ai_health", version: "ai_health_v2" },
  { type: "photo_analysis", version: "photo_analysis_v2" },
];
for (const row of consentRows) {
  const { data: existingConsent } = await admin
    .from("consent_records")
    .select("id")
    .eq("user_id", userId)
    .eq("consent_type", row.type)
    .eq("policy_version", row.version)
    .limit(1)
    .maybeSingle();
  if (existingConsent) continue;
  const inserted = await admin.from("consent_records").insert({
    user_id: userId,
    consent_type: row.type,
    policy_version: row.version,
    metadata: { source: "play_review_provision" },
  });
  if (inserted.error) fail(`consent:${row.type}`, inserted.error);
}

if (passwordLoginOk) {
  await userClient.auth.signOut();
}

const { data: finalProfile, error: finalError } = await admin
  .from("profiles")
  .select("onboarding_status, tier, tier_started_at, team_chat_unlocked, locale")
  .eq("id", userId)
  .single();
if (finalError) fail("verifyProfile", finalError);

const passwordLine = passwordRotated
  ? `Password: ${password}`
  : "Password: (unchanged — existing reviewer password kept)";
const loginLine = passwordLoginOk
  ? "Password sign-in: OK"
  : "Password sign-in: not re-tested (existing password kept; set PLAY_REVIEW_PASSWORD to verify)";

console.log(`
Google Play Console → App content → App access
----------------------------------------------
Restricted: All or some functionality is restricted
Username / email: ${email}
${passwordLine}

Other instructions (paste in English):
1. Open the app and stay on Sign in.
2. Enter the email and password above.
3. Tap "Sign in with password". Do not tap "Send login code" and do not request an email OTP.
4. The account lands on Home / Welcome in English with an Essential plan already active.
5. Coaches, streak, market, analytics, and meal photo are available.

Account status: ${finalProfile.onboarding_status} / ${finalProfile.tier} / started=${Boolean(finalProfile.tier_started_at)} / team=${finalProfile.team_chat_unlocked}
${loginLine}
User id: ${userId}

Keep this password private. Re-run with PLAY_REVIEW_ROTATE=1 to rotate it.
`);
