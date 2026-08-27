/**
 * Fail-fast validation for native Vite public auth env.
 * Maps alternate public names → NEXT_PUBLIC_* without logging secrets.
 */
import { loadEnv } from "vite";

const PLACEHOLDER_HOST_RE =
  /xyzcompany|placeholder|example\.supabase|your[_-]?project|changeme|replace[_-]?me/i;
const PLACEHOLDER_KEY_RE =
  /test-anon-key|placeholder|changeme|replace[_-]?me|your[_-]?anon/i;

function pick(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

function mapPublicEnv() {
  const fileEnv = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (!process.env[key] && value) process.env[key] = value;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    const alt = pick("SUPABASE_URL", "PUBLIC_SUPABASE_URL");
    if (alt) process.env.NEXT_PUBLIC_SUPABASE_URL = alt.value;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    const alt = pick(
      "SUPABASE_ANON_KEY",
      "PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_KEY",
    );
    if (alt) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = alt.value;
  }
}

function fail(message) {
  console.error(`[native-env] ${message}`);
  process.exit(1);
}

function assertUrl(raw) {
  if (!raw) fail("NEXT_PUBLIC_SUPABASE_URL is missing (or unmapped SUPABASE_URL).");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }
  if (parsed.protocol !== "https:") {
    fail("NEXT_PUBLIC_SUPABASE_URL must use https.");
  }
  if (PLACEHOLDER_HOST_RE.test(raw) || PLACEHOLDER_HOST_RE.test(parsed.hostname)) {
    fail("NEXT_PUBLIC_SUPABASE_URL looks like a placeholder host.");
  }
  if (!parsed.hostname.endsWith(".supabase.co") && !parsed.hostname.includes("supabase")) {
    // Allow self-hosted supabase, but still reject known placeholders above.
  }
  return parsed;
}

function assertAnonKey(raw) {
  if (!raw) {
    fail(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing (or unmapped SUPABASE_ANON_KEY).",
    );
  }
  if (PLACEHOLDER_KEY_RE.test(raw)) {
    fail("NEXT_PUBLIC_SUPABASE_ANON_KEY looks like a placeholder/test key.");
  }
  if (/service_role/i.test(raw)) {
    fail("NEXT_PUBLIC_SUPABASE_ANON_KEY must not be a service_role key.");
  }
  // JWT role claim check without printing the key.
  const parts = raw.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      if (payload?.role === "service_role") {
        fail("NEXT_PUBLIC_SUPABASE_ANON_KEY decodes to service_role — refused.");
      }
    } catch {
      // Non-JWT anon keys are unusual; still allow if not placeholder.
    }
  }
}

mapPublicEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

const parsed = assertUrl(url);
assertAnonKey(anon);

const projectRef = parsed.hostname.split(".")[0] || "(unknown)";
console.log(
  `[native-env] OK public supabase host=${parsed.hostname} project_ref=${projectRef} anon_key=present`,
);
