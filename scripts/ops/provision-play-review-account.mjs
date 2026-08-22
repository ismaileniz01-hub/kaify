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
 *   PLAY_REVIEW_PASSWORD  (alphanumeric, min 8; generated if omitted)
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_EMAIL = "play-review@kaifyai.org";
const EXPIRES_AT = "2099-12-31T23:59:59.000Z";
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
const password = load("PLAY_REVIEW_PASSWORD") || generatePassword();
if (password.length < 8 || /[^A-Za-z0-9]/.test(password)) {
  fail(
    "password",
    new Error("PLAY_REVIEW_PASSWORD must be alphanumeric and at least 8 characters"),
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId = null;
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: "Play Reviewer" },
});

if (created.data.user) {
  userId = created.data.user.id;
} else {
  const existing = await findUserByEmail(admin, email);
  if (!existing) fail("createUser", created.error);
  userId = existing.id;
  const updated = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updated.error) fail("updateUser", updated.error);
}

const userClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const signedIn = await userClient.auth.signInWithPassword({ email, password });
if (signedIn.error || !signedIn.data.user) fail("signIn", signedIn.error);

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("onboarding_status, tier")
  .eq("id", userId)
  .single();
if (profileError) fail("loadProfile", profileError);

if (profile.onboarding_status !== "ACTIVE") {
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
  p_tier: "premium_max",
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

await userClient.auth.signOut();

const { data: finalProfile, error: finalError } = await admin
  .from("profiles")
  .select("onboarding_status, tier, team_chat_unlocked, locale")
  .eq("id", userId)
  .single();
if (finalError) fail("verifyProfile", finalError);

console.log(`
Google Play Console → App content → App access
----------------------------------------------
Restricted: All or some functionality is restricted
Username / email: ${email}
Password: ${password}

Other instructions (paste in English):
1. Open the app and stay on Sign in.
2. Enter the email and password above.
3. Tap "Sign in with password". Do not tap "Send login code" and do not request an email OTP.
4. The account lands on Home / Welcome in English with a Premium plan already active.
5. Coaches, streak, market, analytics, meal photo, and weekly team meeting are available.

Account status: ${finalProfile.onboarding_status} / ${finalProfile.tier} / team=${finalProfile.team_chat_unlocked}
User id: ${userId}

Keep this password private. Re-run the script to rotate it.
`);
