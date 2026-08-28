import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native auth bootstrap packaging", () => {
  const viteNative = source("vite.native.config.ts");
  const packageJson = source("package.json");
  const codemagic = source("codemagic.yaml");
  const assertEnv = source("scripts/native/assert-native-public-env.mjs");
  const verify = source("scripts/native/verify-native-bundle.mjs");
  const clean = source("scripts/native/clean-native-web-assets.mjs");

  it("fails native Vite build when public Supabase env is missing or placeholder", () => {
    expect(viteNative).toContain("requirePublicAuthEnv");
    expect(viteNative).not.toContain(
      "JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || \"\")",
    );
    expect(viteNative).toContain("xyzcompany");
    expect(viteNative).toContain("test-anon-key");
    expect(assertEnv).toContain("PLACEHOLDER_HOST_RE");
    expect(assertEnv).toContain("service_role");
  });

  it("wires native:build through assert → clean → vite → verify", () => {
    expect(packageJson).toContain(
      "scripts/native/assert-native-public-env.mjs",
    );
    expect(packageJson).toContain("scripts/native/clean-native-web-assets.mjs");
    expect(packageJson).toContain("scripts/native/verify-native-bundle.mjs");
    expect(clean).toContain("native-dist");
    expect(clean).toContain("android/app/src/main/assets/public");
    expect(clean).toContain("ios/App/App/public");
  });

  it("rejects Next AuthLoadingFallback and placeholder hosts in verify", () => {
    expect(verify).toContain("Send login code");
    expect(verify).toContain("Loading secure sign-in");
    expect(verify).toContain("xyzcompany.supabase.co");
    expect(verify).toContain("test-anon-key");
    expect(verify).toContain("server.url");
    expect(verify).toContain("Sign in locally");
  });

  it("Codemagic uses native:build not build:cap for store shells", () => {
    expect(codemagic).toContain("npm run native:build");
    expect(codemagic).toContain("npx cap sync ios");
    expect(codemagic).toContain("npx cap sync android");
    expect(codemagic).not.toMatch(/npm run build:cap/);
  });

  it("keeps WebView auth off supabase.co and login unblocked at boot", () => {
    const session = source("native-app/src/session.ts");
    const app = source("native-app/src/App.tsx");
    const capacitor = source("capacitor.config.ts");
    expect(session).toContain("nativeGoTrueFetch");
    expect(app).toContain("const [busy, setBusy] = useState(false)");
    expect(capacitor).not.toContain('iosScheme: "https"');
  });
});
