#!/usr/bin/env node
/**
 * Apply 6-digit OTP email templates to Supabase Auth.
 *
 * Requires a Supabase personal access token with auth_config_write:
 *   https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... npm run auth:otp-template
 */

import fs from "node:fs";
import path from "node:path";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "urnetodzvszmddzdazdj";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens\n" +
      "Then run: SUPABASE_ACCESS_TOKEN=... npm run auth:otp-template",
  );
  process.exit(1);
}

function readTemplate(fileName) {
  const raw = fs.readFileSync(path.join(templateDir, fileName), "utf8");
  return raw.replace(/<!--[\s\S]*?-->/g, "").trim();
}

const templateDir = path.join(process.cwd(), "supabase/email-templates");
const magicSubject = fs
  .readFileSync(path.join(templateDir, "magic-link-otp.en.subject.txt"), "utf8")
  .trim();
const confirmSubject = fs
  .readFileSync(path.join(templateDir, "confirm-signup-otp.en.subject.txt"), "utf8")
  .trim();
const magicContent = readTemplate("magic-link-otp.en.html");
const confirmContent = readTemplate("confirm-signup-otp.en.html");

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mailer_subjects_magic_link: magicSubject,
      mailer_templates_magic_link_content: magicContent,
      mailer_subjects_confirmation: confirmSubject,
      mailer_templates_confirmation_content: confirmContent,
      mailer_otp_length: 6,
    }),
  },
);

const body = await response.text();
if (!response.ok) {
  console.error(`Failed (${response.status}):`, body);
  process.exit(1);
}

console.log("Supabase email templates updated for 6-digit OTP.");
console.log(`Project: ${PROJECT_REF}`);
console.log(`Magic link subject: ${magicSubject}`);
console.log(`Confirm signup subject: ${confirmSubject}`);
