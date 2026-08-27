import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const PLACEHOLDER_HOST_RE =
  /xyzcompany|placeholder|example\.supabase|your[_-]?project|changeme|replace[_-]?me/i;
const PLACEHOLDER_KEY_RE =
  /test-anon-key|placeholder|changeme|replace[_-]?me|your[_-]?anon/i;

function requirePublicAuthEnv(env: Record<string, string>) {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url) {
    throw new Error(
      "[vite.native] NEXT_PUBLIC_SUPABASE_URL is required (no empty fallback).",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("[vite.native] NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("[vite.native] NEXT_PUBLIC_SUPABASE_URL must use https.");
  }
  if (PLACEHOLDER_HOST_RE.test(url) || PLACEHOLDER_HOST_RE.test(parsed.hostname)) {
    throw new Error(
      "[vite.native] NEXT_PUBLIC_SUPABASE_URL looks like a placeholder host.",
    );
  }
  if (!anon) {
    throw new Error(
      "[vite.native] NEXT_PUBLIC_SUPABASE_ANON_KEY is required (no empty fallback).",
    );
  }
  if (PLACEHOLDER_KEY_RE.test(anon) || /service_role/i.test(anon)) {
    throw new Error(
      "[vite.native] NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid (placeholder or service_role).",
    );
  }
  return { url, anon };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (!env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.SUPABASE_URL?.trim()) {
    env.NEXT_PUBLIC_SUPABASE_URL = env.SUPABASE_URL.trim();
  }
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && env.SUPABASE_ANON_KEY?.trim()) {
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY.trim();
  }
  // Prefer process.env (CI / mapped) over file env.
  const merged = {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      env.NEXT_PUBLIC_SUPABASE_URL ||
      "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    NATIVE_API_BASE_URL:
      process.env.NATIVE_API_BASE_URL?.trim() ||
      env.NATIVE_API_BASE_URL ||
      "",
    NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_IOS_SITE_KEY:
      process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_IOS_SITE_KEY?.trim() ||
      env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_IOS_SITE_KEY ||
      "",
    RECAPTCHA_ENTERPRISE_IOS_SITE_KEY:
      process.env.RECAPTCHA_ENTERPRISE_IOS_SITE_KEY?.trim() ||
      env.RECAPTCHA_ENTERPRISE_IOS_SITE_KEY ||
      "",
  };
  const { url, anon } = requirePublicAuthEnv(merged);
  const apiBase =
    merged.NATIVE_API_BASE_URL.trim() || "https://kaifyai.org";
  const iosRecaptchaKey = (
    merged.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_IOS_SITE_KEY ||
    merged.RECAPTCHA_ENTERPRISE_IOS_SITE_KEY ||
    ""
  ).trim();

  return {
    root: "native-app",
    base: "./",
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(process.cwd()),
      },
    },
    define: {
      "process.env": {},
      __KAIFY_API_BASE__: JSON.stringify(apiBase),
      __SUPABASE_URL__: JSON.stringify(url),
      __SUPABASE_ANON_KEY__: JSON.stringify(anon),
      __RECAPTCHA_ENTERPRISE_IOS_SITE_KEY__: JSON.stringify(iosRecaptchaKey),
    },
    build: {
      outDir: "../native-dist",
      emptyOutDir: true,
      sourcemap: true,
      target: "es2022",
    },
  };
});
