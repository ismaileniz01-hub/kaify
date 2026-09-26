import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadDotEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
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
    if (!process.env[key]) process.env[key] = val;
  }
}
loadDotEnvLocal();

/**
 * Live staging credential gates for KAIOS validation.
 * Tests MUST skip (not fail) when credentials are absent.
 */

export type LiveCredentialReport = {
  deepseek: boolean;
  gemini: boolean;
  supabase: boolean;
  supabaseServiceRole: boolean;
  stagingUrl: boolean;
  e2eAuth: boolean;
  dualUser: boolean;
  councilEntitledUser: boolean;
};

function present(value: string | undefined): boolean {
  const v = value?.trim() ?? "";
  if (!v) return false;
  const lower = v.toLowerCase();
  return !(
    lower.includes("your_") ||
    lower.includes("changeme") ||
    lower.includes("replace_me") ||
    lower.includes("_here")
  );
}

export function liveCredentials(): LiveCredentialReport {
  return {
    deepseek: present(process.env.DEEPSEEK_API_KEY),
    gemini: present(process.env.GEMINI_API_KEY),
    supabase:
      present(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    stagingUrl: present(
      process.env.STAGING_URL ?? process.env.PLAYWRIGHT_BASE_URL,
    ),
    e2eAuth:
      process.env.E2E_AUTH_ENABLED === "1" &&
      present(process.env.E2E_OTP_EMAIL) &&
      present(process.env.E2E_OTP_CODE),
    dualUser:
      present(process.env.KAIOS_LIVE_USER_A_ID) &&
      present(process.env.KAIOS_LIVE_USER_B_ID) &&
      present(process.env.KAIOS_LIVE_USER_A_JWT) &&
      present(process.env.KAIOS_LIVE_USER_B_JWT),
    councilEntitledUser: present(process.env.KAIOS_LIVE_COUNCIL_USER_ID),
  };
}

export function skipReason(needed: keyof LiveCredentialReport): string {
  return `LIVE blocked: missing ${needed} credentials (set staging secrets / Cursor environment)`;
}
