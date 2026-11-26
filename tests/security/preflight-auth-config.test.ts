import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts/ops/preflight-auth-config.mjs");
const template = (file: string) =>
  readFileSync(join(process.cwd(), "supabase/email-templates", file), "utf8");
const subject = (file: string) => template(file).trim();

const SAFE = {
  mailer_autoconfirm: false,
  disable_signup: false,
  external_email_enabled: true,
  mailer_allow_unverified_email_sign_ins: false,
  external_anonymous_users_enabled: false,
  hook_send_email_enabled: false,
  security_manual_linking_enabled: false,
  mailer_otp_length: 6,
  mailer_otp_exp: 3600,
  mailer_templates_confirmation_content: template("confirm-signup-otp.en.html"),
  mailer_templates_magic_link_content: template("magic-link-otp.en.html"),
  mailer_templates_email_change_content: template("email-change-otp.en.html"),
  mailer_subjects_confirmation: subject("confirm-signup-otp.en.subject.txt"),
  mailer_subjects_magic_link: subject("magic-link-otp.en.subject.txt"),
  mailer_subjects_email_change: subject("email-change-otp.en.subject.txt"),
  smtp_pass: "secret-that-must-not-print",
};

/** Runs the real script with fetch answered locally; nothing leaves the process. */
function run(body: unknown, env: Record<string, string> = {}) {
  const stub = `globalThis.fetch = async () => new Response(${JSON.stringify(JSON.stringify(body))}, { status: 200 });`;
  return spawnSync(
    process.execPath,
    ["--import", `data:text/javascript,${encodeURIComponent(stub)}`, SCRIPT],
    {
      encoding: "utf8",
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH ?? "",
        SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
        SUPABASE_ACCESS_TOKEN: "test-token",
        ...env,
      },
    },
  );
}

describe("scripts/ops/preflight-auth-config.mjs", () => {
  it("passes the repository's own templates and safe settings", () => {
    const result = run(SAFE);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("secret-that-must-not-print");
  });

  it.each([
    ["autoconfirm on", { mailer_autoconfirm: true }],
    ["a link in Confirm signup", { mailer_templates_confirmation_content: "<a href=\"{{ .ConfirmationURL }}\">x</a>" }],
    ["the hosted default (unset) template", { mailer_templates_confirmation_content: null }],
    ["a link in Change Email", { mailer_templates_email_change_content: "{{ .ConfirmationURL }} {{ .Token }}" }],
    [
      "the code only in the Turkish branch",
      {
        mailer_templates_confirmation_content:
          '{{ if eq (printf "%v" .Data.language) "tr" }}{{ .Token }}{{ else }}Merhaba{{ end }}',
      },
    ],
    ["a fragile language branch", { mailer_templates_magic_link_content: "{{ if eq .Data.language \"tr\" }}{{ .Token }}{{ else }}{{ .Token }}{{ end }}" }],
    ["a send-email hook", { hook_send_email_enabled: true }],
    ["OTP expiry as text", { mailer_otp_exp: "3600" }],
  ])("fails (exit 1) with %s", (_label, override) => {
    expect(run({ ...SAFE, ...override }).status).toBe(1);
  });

  it("cannot check (exit 2) without credentials or with an empty answer", () => {
    expect(run(SAFE, { SUPABASE_ACCESS_TOKEN: "" }).status).toBe(2);
    expect(run(null).status).toBe(2);
  });
});

describe("scripts/apply-supabase-otp-email-template.mjs", () => {
  const APPLY = join(process.cwd(), "scripts/apply-supabase-otp-email-template.mjs");
  const files = [
    "confirm-signup-otp.en",
    "magic-link-otp.en",
    "email-change-otp.en",
  ].flatMap((name) => [`${name}.html`, `${name}.subject.txt`]);

  /** Copies the real templates to a temp project, optionally breaking one. */
  function apply(mutate?: (name: string, body: string) => string) {
    const dir = mkdtempSync(join(tmpdir(), "kaify-tpl-"));
    mkdirSync(join(dir, "supabase/email-templates"), { recursive: true });
    for (const name of files) {
      const body = template(name);
      writeFileSync(join(dir, "supabase/email-templates", name), mutate ? mutate(name, body) : body);
    }
    const stub = `globalThis.fetch = async (_u, init) => { console.log("PATCHED", Object.keys(JSON.parse(init.body)).sort().join(",")); return new Response("{}", { status: 200 }); };`;
    const result = spawnSync(
      process.execPath,
      ["--import", `data:text/javascript,${encodeURIComponent(stub)}`, APPLY],
      {
        cwd: dir,
        encoding: "utf8",
        env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst", SUPABASE_ACCESS_TOKEN: "t" },
      },
    );
    rmSync(dir, { recursive: true, force: true });
    return result;
  }

  it("applies all three code-only templates", () => {
    const result = apply();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("mailer_templates_email_change_content");
    expect(result.stdout).toContain("mailer_templates_confirmation_content");
  });

  it("refuses to upload a template with a link, before any request", () => {
    const result = apply((name, body) =>
      name === "confirm-signup-otp.en.html" ? `${body}<a href="{{ .ConfirmationURL }}">x</a>` : body,
    );
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain("PATCHED");
  });
});

describe("scripts/ops/grant-owner-access.mjs", () => {
  it("refuses to grant admin to an unverified address", () => {
    const source = readFileSync(join(process.cwd(), "scripts/ops/grant-owner-access.mjs"), "utf8");
    const check = source.indexOf("if (!user.email_confirmed_at)");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(source.indexOf("apply_subscription"));
  });
});
