#!/usr/bin/env node
/**
 * Read-only check of the hosted Supabase Auth settings that account safety
 * depends on. Prints booleans only; the API response contains secrets.
 *
 * Needs a Supabase access token with auth_config_read:
 *   SUPABASE_PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... node scripts/ops/preflight-auth-config.mjs
 *
 * Exit 0: safe to deploy. Exit 1: at least one check failed. Exit 2: could not check.
 */
const ref = process.env.SUPABASE_PROJECT_REF?.trim();
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!/^[a-z]{20}$/.test(ref ?? "") || !token) {
  console.error("Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN.");
  process.exit(2);
}

let config;
try {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.error(`HTTP ${response.status}`);
    process.exit(2);
  }
  config = await response.json();
  if (!config || typeof config !== "object") throw new Error("empty");
} catch {
  console.error("Request failed.");
  process.exit(2);
}

const strip = (value) => String(value ?? "").replace(/<!--[\s\S]*?-->/g, "");
const hasToken = (value) => /\{\{-?\s*\.Token\s*-?\}\}/.test(strip(value));
// The code must sit outside every if/else (all languages get it), and a bare
// `eq .Data.language` must not be used: it fails to render for non-strings.
const tokenOutsideBranches = (value) => {
  let depth = 0;
  for (const match of strip(value).matchAll(/\{\{-?\s*(if|end|\.Token)\b/g)) {
    if (match[1] === "if") depth += 1;
    else if (match[1] === "end") depth -= 1;
    else if (depth === 0) return true;
  }
  return false;
};
const isRobust = (value) =>
  tokenOutsideBranches(value) && !/eq\s+\.Data\.language/.test(strip(value));
const hasNoLink = (value) =>
  strip(value).trim().length > 0 &&
  !/ConfirmationURL|TokenHash|RedirectTo|SiteURL|href\s*=|https?:\/\//i.test(strip(value));

const must = {
  email_confirmation_required: config.mailer_autoconfirm === false,
  signups_enabled: config.disable_signup === false,
  email_provider_enabled: config.external_email_enabled === true,
  unverified_sign_in_off: config.mailer_allow_unverified_email_sign_ins === false,
  anonymous_sign_in_off: config.external_anonymous_users_enabled === false,
  send_email_hook_off: config.hook_send_email_enabled !== true,
  manual_linking_off: config.security_manual_linking_enabled === false,
  otp_length_is_6: config.mailer_otp_length === 6,
  otp_expiry_at_most_1h:
    Number.isInteger(config.mailer_otp_exp) &&
    config.mailer_otp_exp > 0 &&
    config.mailer_otp_exp <= 3600,
  confirm_template_has_code: hasToken(config.mailer_templates_confirmation_content),
  confirm_template_has_no_link: hasNoLink(config.mailer_templates_confirmation_content),
  magic_link_template_has_code: hasToken(config.mailer_templates_magic_link_content),
  magic_link_template_has_no_link: hasNoLink(config.mailer_templates_magic_link_content),
  email_change_template_has_code: hasToken(config.mailer_templates_email_change_content),
  email_change_template_has_no_link: hasNoLink(config.mailer_templates_email_change_content),
  templates_render_every_language:
    isRobust(config.mailer_templates_confirmation_content) &&
    isRobust(config.mailer_templates_magic_link_content) &&
    isRobust(config.mailer_templates_email_change_content),
  subjects_have_no_link: [
    config.mailer_subjects_confirmation,
    config.mailer_subjects_magic_link,
    config.mailer_subjects_email_change,
  ].every((s) => !/https?:|href|ConfirmationURL/i.test(String(s ?? ""))),
};
const info = {
  captcha_enabled: config.security_captcha_enabled === true,
  before_user_created_hook_on: config.hook_before_user_created_enabled === true,
  custom_access_token_hook_on: config.hook_custom_access_token_enabled === true,
};

console.log(JSON.stringify({ must, info }, null, 2));
process.exitCode = Object.values(must).every(Boolean) ? 0 : 1;
