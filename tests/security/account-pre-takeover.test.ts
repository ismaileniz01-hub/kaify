/**
 * Mailbox ownership must be proven before an account becomes trusted.
 *
 * Default backend: tests/helpers/fake-gotrue.ts (runs in CI, no services).
 * Live backend: set KAIFY_AUTH_LIVE_TESTS=1 with AUTH_LIVE_URL, AUTH_LIVE_ANON_KEY,
 * AUTH_LIVE_SERVICE_KEY and AUTH_LIVE_MAIL_URL (GET ?to=<email> -> [{ code }]).
 * Only loopback URLs are accepted: never point this at a hosted project.
 */
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { startFakeGoTrue, type FakeGoTrue } from "../helpers/fake-gotrue";

vi.mock("@/lib/api/rate-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/rate-guard")>(
    "@/lib/api/rate-guard",
  );
  const pass = vi.fn().mockResolvedValue(undefined);
  return {
    ...actual,
    enforcePublicRateLimit: pass,
    enforceUserRateLimit: pass,
    enforceOtpResendCooldown: pass,
    enforceOtpTargetRateLimit: pass,
    enforceOtpTargetHourlyRateLimit: pass,
    enforceOtpVerifyTargetRateLimit: pass,
  };
});
vi.mock("@/lib/observability/tracing", () => ({
  withSpan: async (_name: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock("@/lib/api/request-context", () => ({ getRequestId: async () => "test-req" }));
vi.mock("@/lib/events/product", () => ({
  emitProductEvent: vi.fn(),
  productEventIdempotencyKey: (parts: unknown[]) => parts.join(":"),
}));
vi.mock("@/lib/api-security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-security")>(
    "@/lib/api-security",
  );
  return {
    ...actual,
    validateRecaptcha: vi.fn().mockResolvedValue(true),
    getClientIP: () => "127.0.0.1",
  };
});

import { POST as otpSend } from "@/app/api/auth/otp/send/route";
import { POST as otpVerify } from "@/app/api/auth/otp/verify/route";
import { POST as passwordLogin } from "@/app/api/auth/password/route";
import { sendAuthEmailOtp } from "@/lib/auth/send-otp-server";

const LIVE = process.env.KAIFY_AUTH_LIVE_TESTS === "1";
const ATTACKER_PASSWORD = "Attacker-Pass-1a!";
/** lib/supabase/env.ts only accepts HTTPS, so app code talks to this alias. */
const ALIAS = "https://auth.kaify.test";

type Backend = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  latestCode: (email: string) => Promise<string | null>;
};

let fake: FakeGoTrue | null = null;
let backend: Backend;

function requireLoopback(raw: string | undefined, name: string): string {
  const value = raw ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(value)) {
    throw new Error(`${name} must be a loopback URL`);
  }
  return value.replace(/\/$/, "");
}

beforeAll(async () => {
  if (LIVE) {
    const mailUrl = requireLoopback(process.env.AUTH_LIVE_MAIL_URL, "AUTH_LIVE_MAIL_URL");
    backend = {
      url: requireLoopback(process.env.AUTH_LIVE_URL, "AUTH_LIVE_URL"),
      anonKey: process.env.AUTH_LIVE_ANON_KEY ?? "",
      serviceRoleKey: process.env.AUTH_LIVE_SERVICE_KEY ?? "",
      latestCode: async (email) => {
        const res = await fetch(`${mailUrl}?to=${encodeURIComponent(email)}`);
        const mails = (await res.json()) as Array<{ code: string | null }>;
        return mails.at(-1)?.code ?? null;
      },
    };
    return;
  }
  fake = await startFakeGoTrue();
  const server = fake;
  backend = {
    url: server.url,
    anonKey: server.anonKey,
    serviceRoleKey: server.serviceRoleKey,
    latestCode: async (email) => server.latestCode(email),
  };
});

afterAll(async () => {
  await fake?.close();
});

const realFetch = globalThis.fetch;

beforeEach(() => {
  // Route the alias to the loopback backend and refuse every other host, so
  // this suite can never reach a hosted project.
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const target = url.replace(ALIAS, backend.url);
    requireLoopback(target, "fetch target");
    return input instanceof Request
      ? realFetch(new Request(target, input), init)
      : realFetch(target, init);
  }) as typeof fetch;
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ALIAS);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", backend.anonKey);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", backend.serviceRoleKey);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  fake?.onOtpLookup(null);
  vi.unstubAllEnvs();
});

const dummyEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.com`;

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Direct provider calls an anonymous internet user can make with the public key. */
async function provider(path: string, body: unknown, bearer = backend.anonKey) {
  const res = await fetch(`${backend.url}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: backend.anonKey,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const attackerSignup = (email: string) =>
  provider("/signup", { email, password: ATTACKER_PASSWORD });
const directPasswordGrant = (email: string, password = ATTACKER_PASSWORD) =>
  provider("/token?grant_type=password", { email, password });

async function adminCreate(attributes: Record<string, unknown>): Promise<string> {
  const { status, body } = await provider("/admin/users", attributes, backend.serviceRoleKey);
  expect(status).toBe(200);
  return String(body.id);
}

async function adminFind(email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const res = await fetch(`${backend.url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: {
        apikey: backend.serviceRoleKey,
        Authorization: `Bearer ${backend.serviceRoleKey}`,
      },
    });
    const { users } = (await res.json()) as {
      users: Array<{ id: string; email: string; email_confirmed_at?: string }>;
    };
    const found = users.find((u) => u.email === email);
    if (found) return found;
    if (users.length < 200) return null;
  }
  return null;
}

const send = (email: string) => otpSend(post("/api/auth/otp/send", { email, locale: "en" }));
const verify = (email: string, token: string) =>
  otpVerify(post("/api/auth/otp/verify", { email, token }));
const appPasswordLogin = (email: string, password = ATTACKER_PASSWORD) =>
  passwordLogin(post("/api/auth/password", { email, password }));

/** GoTrue enforces a minimum gap between mails to one address. */
const MAIL_GAP_MS = Number(process.env.AUTH_LIVE_MAIL_GAP_MS ?? "1200");
const mailGap = () =>
  LIVE ? new Promise((resolve) => setTimeout(resolve, MAIL_GAP_MS)) : Promise.resolve();

async function code(email: string): Promise<string> {
  const value = await backend.latestCode(email);
  expect(value).toMatch(/^\d{6}$/);
  return value!;
}

async function expectNoPasswordAccess(email: string) {
  expect((await directPasswordGrant(email)).status).toBe(400);
  expect((await appPasswordLogin(email)).status).toBe(401);
}

describe(`account pre-takeover (${LIVE ? "live GoTrue" : "fake GoTrue"})`, () => {
  it("T1: preparing an OTP leaves an unverified account unverified", async () => {
    const email = dummyEmail("t1");
    await attackerSignup(email);
    await mailGap();

    expect((await send(email)).status).toBe(200);

    expect((await adminFind(email))?.email_confirmed_at).toBeUndefined();
  });

  it("T1b: preparing an OTP for an unknown address does not create a verified account", async () => {
    const email = dummyEmail("t1b");

    expect((await send(email)).status).toBe(200);

    const user = await adminFind(email);
    expect(user).not.toBeNull();
    expect(user?.email_confirmed_at).toBeUndefined();
  });

  it("T2: an attacker-created account gains no access from the OTP request itself", async () => {
    const email = dummyEmail("t2");
    await attackerSignup(email);
    await expectNoPasswordAccess(email);
    await mailGap();

    expect((await send(email)).status).toBe(200);

    await expectNoPasswordAccess(email);
  });

  it("T2b: the attacker's password does not survive the owner's verification", async () => {
    const email = dummyEmail("t2b");
    await attackerSignup(email);
    await mailGap();
    expect((await send(email)).status).toBe(200);

    expect((await verify(email, await code(email))).status).toBe(200);

    expect((await adminFind(email))?.email_confirmed_at).toBeTruthy();
    await expectNoPasswordAccess(email);
  });

  it("T2c: an attacker signing up after the code was sent still gets nothing", async () => {
    const email = dummyEmail("t2c");
    expect((await send(email)).status).toBe(200);
    await mailGap();
    await attackerSignup(email);
    await mailGap();
    // The owner asks again because the first code was superseded.
    expect((await send(email)).status).toBe(200);

    expect((await verify(email, await code(email))).status).toBe(200);

    await expectNoPasswordAccess(email);
  });

  it("T2d: a code that the attacker's own signup mailed cannot hand the account over", async () => {
    const email = dummyEmail("t2d");
    expect((await send(email)).status).toBe(200);
    await mailGap();
    await attackerSignup(email);

    // The owner enters the most recent code, the one triggered by the attacker.
    expect((await verify(email, await code(email))).status).toBe(200);

    await expectNoPasswordAccess(email);
  });

  it("T3: an existing verified account keeps its status, id and OTP login", async () => {
    const email = dummyEmail("t3");
    const id = await adminCreate({ email, email_confirm: true });
    const before = await adminFind(email);

    expect((await send(email)).status).toBe(200);
    const res = await verify(email, await code(email));

    expect(res.status).toBe(200);
    const after = await adminFind(email);
    expect(after?.id).toBe(id);
    expect(after?.email_confirmed_at).toBe(before?.email_confirmed_at);
  });

  it("T4: a new user registers only with the mailed code", async () => {
    const email = dummyEmail("t4");
    expect((await send(email)).status).toBe(200);
    const real = await code(email);
    const wrong = real === "000000" ? "000001" : "000000";

    expect((await verify(email, wrong)).status).toBe(401);
    expect((await adminFind(email))?.email_confirmed_at).toBeUndefined();

    const res = await verify(email, real);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toMatch(/auth-token/);
    expect((await adminFind(email))?.email_confirmed_at).toBeTruthy();

    // The code is single use.
    expect((await verify(email, real)).status).toBe(401);
  });

  it("T4b: a user who registered by OTP can sign in again by OTP", async () => {
    const email = dummyEmail("t4b");
    await send(email);
    expect((await verify(email, await code(email))).status).toBe(200);
    await mailGap();

    expect((await send(email)).status).toBe(200);
    expect((await verify(email, await code(email))).status).toBe(200);
  });

  it("T5: password login works for a provisioned reviewer and fails for unverified accounts", async () => {
    const reviewer = dummyEmail("t5-reviewer");
    await adminCreate({ email: reviewer, password: "Reviewer-Pass-1a!", email_confirm: true });
    expect((await appPasswordLogin(reviewer, "Reviewer-Pass-1a!")).status).toBe(200);
    await send(reviewer);
    expect((await appPasswordLogin(reviewer, "Reviewer-Pass-1a!")).status).toBe(200);

    const unverified = dummyEmail("t5-unverified");
    const signup = await attackerSignup(unverified);
    expect(signup.body).not.toHaveProperty("access_token");
    await expectNoPasswordAccess(unverified);
  });

  it("T6: a provider-verified (OAuth) account still signs in by OTP and stays verified", async () => {
    const email = dummyEmail("t6");
    const id = await adminCreate({
      email,
      email_confirm: true,
      app_metadata: { provider: "google", providers: ["google"] },
    });

    expect((await send(email)).status).toBe(200);
    expect((await verify(email, await code(email))).status).toBe(200);

    const after = await adminFind(email);
    expect(after?.id).toBe(id);
    expect(after?.email_confirmed_at).toBeTruthy();
  });

  it("T7: resends never change the verification state", async () => {
    const email = dummyEmail("t7");
    await attackerSignup(email);
    for (let i = 0; i < 3; i += 1) {
      await mailGap();
      expect((await send(email)).status).toBe(200);
      expect((await adminFind(email))?.email_confirmed_at).toBeUndefined();
    }
    await expectNoPasswordAccess(email);

    expect((await verify(email, await code(email))).status).toBe(200);
    await expectNoPasswordAccess(email);
  });

  // Needs a provider configured with a long gap: AUTH_LIVE_MAIL_GAP_MS=60000 -t T7b
  it.runIf(LIVE && MAIL_GAP_MS >= 10_000)("T7b: a rate-limited send still removes the planted password", async () => {
    const email = dummyEmail("t7b");
    await attackerSignup(email);

    // No gap: the provider refuses a second mail, but must already have cleared.
    const res = await send(email);
    expect(res.status).toBe(429);

    expect((await verify(email, await code(email))).status).toBe(200);
    await expectNoPasswordAccess(email);
  });

  it.runIf(LIVE)("T7c: attacker-supplied metadata cannot break the owner's code mail", async () => {
    const email = dummyEmail("t7c");
    await provider("/signup", {
      email,
      password: ATTACKER_PASSWORD,
      data: { language: { nested: true } },
    });
    await mailGap();
    expect((await send(email)).status).toBe(200);
    expect((await verify(email, await code(email))).status).toBe(200);
    await expectNoPasswordAccess(email);
  });

  it("T8: concurrent OTP requests and attacker signups never verify the account", async () => {
    const email = dummyEmail("t8");
    await Promise.allSettled([
      ...Array.from({ length: 6 }, () => sendAuthEmailOtp(email)),
      ...Array.from({ length: 6 }, () => attackerSignup(email)),
    ]);
    expect((await adminFind(email))?.email_confirmed_at).toBeUndefined();
    await expectNoPasswordAccess(email);

    await mailGap();
    expect((await send(email)).status).toBe(200);
    expect((await verify(email, await code(email))).status).toBe(200);
    await expectNoPasswordAccess(email);
  });

  it("T8b: a signup racing the very first OTP request cannot plant a password", async () => {
    for (let round = 0; round < (LIVE ? 25 : 5); round += 1) {
      const email = dummyEmail(`t8b-${round}`);
      // On the fake, the attacker deterministically wins the insert race and
      // the Admin create fails, as it does on GoTrue under contention.
      fake?.raceNextAdminCreate(email, ATTACKER_PASSWORD);
      const sent = sendAuthEmailOtp(email);
      const raced = Promise.allSettled([attackerSignup(email), attackerSignup(email)]);
      await Promise.allSettled([sent, raced]);

      const value = await backend.latestCode(email);
      if (!value) continue;
      await verify(email, value);
      await expectNoPasswordAccess(email);
    }
  });

  it("T9: unknown, unverified and verified addresses get the same response", async () => {
    const unknown = dummyEmail("t9-new");
    const unverified = dummyEmail("t9-unverified");
    const verified = dummyEmail("t9-verified");
    await attackerSignup(unverified);
    await adminCreate({ email: verified, email_confirm: true });
    await mailGap();

    const shapes = [];
    for (const email of [unknown, unverified, verified]) {
      const res = await send(email);
      shapes.push({ status: res.status, body: await res.json() });
    }
    expect(shapes[0].status).toBe(200);
    expect(shapes[1]).toEqual(shapes[0]);
    expect(shapes[2]).toEqual(shapes[0]);

    // Same for a wrong code and for a wrong password.
    for (const attempt of [
      (email: string) => verify(email, "000000"),
      (email: string) => appPasswordLogin(email, "Wrong-Password-1a!"),
    ]) {
      const results = [];
      for (const email of [dummyEmail("t9-none"), unverified, verified]) {
        const res = await attempt(email);
        results.push({ status: res.status, body: await res.json() });
      }
      expect(results[0].status).toBe(401);
      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);
    }
  });

  it("T10: an attacker's unverified account never yields a session or another user's id", async () => {
    const victim = dummyEmail("t10-victim");
    const victimId = await adminCreate({ email: victim, email_confirm: true });
    const other = dummyEmail("t10-attacker");
    const signup = await attackerSignup(other);
    expect(signup.body).not.toHaveProperty("access_token");
    expect(signup.body.id).not.toBe(victimId);
    await expectNoPasswordAccess(other);

    // Signing up again on a verified address must not change its password.
    await attackerSignup(victim);
    await expectNoPasswordAccess(victim);
    expect((await adminFind(victim))?.id).toBe(victimId);
  });

  it.skipIf(LIVE)("never asks the Admin API to force-confirm an email", async () => {
    const start = fake!.forcedConfirmations();
    const email = dummyEmail("force");
    await attackerSignup(email);
    await send(email);
    await send(dummyEmail("force-new"));
    expect(fake!.forcedConfirmations()).toBe(start);
  });
});

describe("no code path or config may confirm an address without proof", () => {
  const root = process.cwd();
  const sources = (dir: string): string[] =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });

  it("application code never sets email_confirm: true", () => {
    const offenders = ["app", "lib", "components", "native-app/src"]
      .flatMap(sources)
      .filter((path) =>
        /email_?confirm\s*:\s*true/i.test(readFileSync(join(root, path), "utf8")),
      );
    expect(offenders).toEqual([]);
  });

  const toml = readFileSync(join(root, "supabase/config.toml"), "utf8").replace(/\r\n/g, "\n");
  const section = (name: string) => toml.match(new RegExp(`^\\[${name.replace(/\./g, "\\.")}\\]\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`, "m"))?.[1] ?? "";

  it("local/pushed Supabase config keeps email confirmation on", () => {
    expect(section("auth.email")).toMatch(/^enable_confirmations = true$/m);
  });

  it.each([
    ["confirmation", "confirm-signup-otp.en"],
    ["magic_link", "magic-link-otp.en"],
    ["email_change", "email-change-otp.en"],
  ])("config pins the %s template to the code-only file", (kind, file) => {
    const body = section(`auth.email.template.${kind}`);
    expect(body).toContain(`content_path = "./supabase/email-templates/${file}.html"`);
    const subject = readFileSync(join(root, "supabase/email-templates", `${file}.subject.txt`), "utf8").trim();
    expect(body).toContain(`subject = '${subject}'`);
  });

  it.each(["confirm-signup-otp.en", "magic-link-otp.en", "email-change-otp.en"])(
    "%s carries a code, no link, and renders for any language value",
    (file) => {
      const read = (ext: string) =>
        readFileSync(join(root, "supabase/email-templates", `${file}.${ext}`), "utf8").replace(
          /<!--[\s\S]*?-->/g,
          "",
        );
      const body = read("html");
      const subject = read("subject.txt");
      expect(body.match(/\{\{ \.Token \}\}/g)).toHaveLength(1);
      // Outside every if/else, so every language receives the code.
      const beforeToken = body.slice(0, body.indexOf("{{ .Token }}"));
      expect(beforeToken.match(/\{\{ if /g)?.length ?? 0).toBe(
        beforeToken.match(/\{\{ end \}\}/g)?.length ?? 0,
      );
      for (const text of [body, subject]) {
        expect(text).not.toMatch(/ConfirmationURL|TokenHash|RedirectTo|SiteURL|href\s*=|https?:/i);
        // A bare `eq .Data.language` fails to render when an attacker plants a non-string.
        expect(text).not.toMatch(/eq\s+\.Data\.language/);
        expect(text).toContain('{{ if eq (printf "%v" .Data.language) "tr" }}');
      }
    },
  );

  it("operator scripts only confirm an address while also replacing its password", () => {
    const offenders = readdirSync(join(root, "scripts/ops"))
      .filter((name) => name.endsWith(".mjs"))
      .flatMap((name) =>
        [...readFileSync(join(root, "scripts/ops", name), "utf8").matchAll(/\{[^{}]*email_confirm\s*:\s*true[^{}]*\}/g)]
          .filter((match) => !/\bpassword\b/.test(match[0]))
          .map(() => name),
      );
    expect(offenders).toEqual([]);
  });
});
