/**
 * In-memory stand-in for the GoTrue endpoints Kaify's OTP flow touches.
 *
 * It models the account-trust semantics of supabase/auth v2.198.0 (the version
 * production reports on /auth/v1/health), not the whole product:
 *  - POST /signup never updates an existing unconfirmed user.
 *  - POST /otp removes the password of an existing unconfirmed user, then mails
 *    a confirmation code; a confirmed user is mailed a login code.
 *  - POST /verify confirms the mailbox; it does not touch the password.
 *  - The password grant rejects unconfirmed users.
 *
 * The scenarios in tests/security/account-pre-takeover.test.ts run against this
 * server in CI, and against a real GoTrue when KAIFY_AUTH_LIVE_TESTS=1, so any
 * drift between the model and the provider shows up there.
 */
import { randomUUID, createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

type FakeUser = {
  id: string;
  email: string;
  password: string | null;
  confirmedAt: string | null;
  confirmationCode: string | null;
  recoveryCode: string | null;
  userMetadata: Record<string, unknown>;
  appMetadata: Record<string, unknown>;
  createdAt: string;
};

export type FakeGoTrue = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  /** Number of times any caller asked the Admin API to force-confirm an email. */
  forcedConfirmations: () => number;
  /** Hook that runs right after /otp has looked the user up (race simulation). */
  onOtpLookup: (hook: ((email: string) => void) | null) => void;
  /**
   * Make the next Admin create for this address lose a race: a public signup
   * with `password` lands first and the Admin call fails with a generic 500,
   * as GoTrue reports a unique-key violation.
   */
  raceNextAdminCreate: (email: string, password: string) => void;
  latestCode: (email: string) => string | null;
  close: () => Promise<void>;
};

const ANON = "fake-anon-key";
const SERVICE = "fake-service-role-key";

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += String(chunk);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function startFakeGoTrue(): Promise<FakeGoTrue> {
  const users = new Map<string, FakeUser>();
  const codes = new Map<string, string>();
  const sessions = new Map<string, string>();
  let forced = 0;
  let counter = 0;
  let otpHook: ((email: string) => void) | null = null;
  const adminRaces = new Map<string, string>();

  const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const byEmail = (email: string) =>
    [...users.values()].find((u) => u.email === email) ?? null;

  const nextCode = () => {
    counter += 1;
    const digest = createHash("sha256").update(`code-${counter}`).digest();
    return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
  };

  const insert = (
    email: string,
    password: string | null,
    confirmed: boolean,
    metadata: Record<string, unknown> = {},
    appMetadata: Record<string, unknown> = {},
  ): FakeUser => {
    const user: FakeUser = {
      id: randomUUID(),
      email,
      password,
      confirmedAt: confirmed ? new Date().toISOString() : null,
      confirmationCode: null,
      recoveryCode: null,
      userMetadata: metadata,
      appMetadata: { provider: "email", providers: ["email"], ...appMetadata },
      createdAt: new Date().toISOString(),
    };
    users.set(user.id, user);
    return user;
  };

  const publicUser = (u: FakeUser) => ({
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    ...(u.confirmedAt
      ? { email_confirmed_at: u.confirmedAt, confirmed_at: u.confirmedAt }
      : {}),
    app_metadata: u.appMetadata,
    user_metadata: u.userMetadata,
    identities: [],
    created_at: u.createdAt,
    updated_at: u.createdAt,
  });

  const session = (u: FakeUser) => {
    const payload = Buffer.from(
      JSON.stringify({ sub: u.id, role: "authenticated", exp: 4_102_444_800 }),
    ).toString("base64url");
    const token = `eyJhbGciOiJub25lIn0.${payload}.${randomUUID().replace(/-/g, "")}`;
    sessions.set(token, u.id);
    return {
      access_token: token,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: 4_102_444_800,
      refresh_token: randomUUID(),
      user: publicUser(u),
    };
  };

  const sendConfirmation = (u: FakeUser) => {
    u.confirmationCode = nextCode();
    codes.set(u.email, u.confirmationCode);
  };

  const signup = (email: string, password: string, data: Record<string, unknown>) => {
    const existing = byEmail(email);
    if (existing?.confirmedAt) {
      return { user: existing, obfuscated: true };
    }
    // "do not update the user because we can't be sure of their claimed identity"
    const user = existing ?? insert(email, password, false, data);
    sendConfirmation(user);
    return { user, obfuscated: false };
  };

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://fake");
      const path = url.pathname.replace(/^\/auth\/v1/, "");
      const bearer = (req.headers.authorization ?? "").replace(/^Bearer /i, "");
      const reply = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      const error = (status: number, code: string, msg: string) =>
        reply(status, { code: status, error_code: code, msg });

      if (path.startsWith("/admin/")) {
        if (bearer !== SERVICE) return error(403, "not_admin", "User not allowed");
        if (path === "/admin/users" && req.method === "POST") {
          const body = await readJson(req);
          const email = norm(body.email);
          const racer = adminRaces.get(email);
          if (racer !== undefined) {
            adminRaces.delete(email);
            signup(email, racer, {});
            return error(500, "unexpected_failure", "Database error creating new user");
          }
          if (byEmail(email)) {
            return error(
              422,
              "email_exists",
              "A user with this email address has already been registered",
            );
          }
          if (body.email_confirm === true) forced += 1;
          const user = insert(
            email,
            // No password supplied => GoTrue generates a random one.
            typeof body.password === "string" ? body.password : randomUUID(),
            body.email_confirm === true,
            (body.user_metadata as Record<string, unknown>) ?? {},
            (body.app_metadata as Record<string, unknown>) ?? {},
          );
          return reply(200, publicUser(user));
        }
        if (path === "/admin/users" && req.method === "GET") {
          const page = Number(url.searchParams.get("page") ?? "1");
          const perPage = Number(url.searchParams.get("per_page") ?? "50");
          const sorted = [...users.values()].reverse();
          return reply(200, {
            aud: "authenticated",
            users: sorted.slice((page - 1) * perPage, page * perPage).map(publicUser),
          });
        }
        const id = path.match(/^\/admin\/users\/([\w-]+)$/)?.[1];
        const user = id ? users.get(id) : undefined;
        if (!user) return error(404, "user_not_found", "User not found");
        if (req.method === "PUT") {
          const body = await readJson(req);
          if (body.email_confirm === true) {
            forced += 1;
            // The provider rewrites the timestamp even for confirmed users.
            user.confirmedAt = new Date(Date.now() + 1000).toISOString();
          }
          if (typeof body.password === "string") user.password = body.password;
          return reply(200, publicUser(user));
        }
        return reply(200, publicUser(user));
      }

      if (path === "/signup" && req.method === "POST") {
        const body = await readJson(req);
        const { user } = signup(
          norm(body.email),
          String(body.password ?? ""),
          (body.data as Record<string, unknown>) ?? {},
        );
        return reply(200, { ...publicUser(user), confirmation_sent_at: new Date().toISOString() });
      }

      if (path === "/otp" && req.method === "POST") {
        const body = await readJson(req);
        const email = norm(body.email);
        const found = byEmail(email);
        if (!found && body.create_user === false) {
          return error(422, "otp_disabled", "Signups not allowed for otp");
        }
        otpHook?.(email);
        if (found?.confirmedAt) {
          found.recoveryCode = nextCode();
          codes.set(email, found.recoveryCode);
          return reply(200, {});
        }
        // magic_link.go: the unconfirmed user's password may belong to someone
        // who does not own the mailbox, so it is removed before confirmation.
        if (found) found.password = null;
        signup(email, randomUUID(), (body.data as Record<string, unknown>) ?? {});
        return reply(200, {});
      }

      if (path === "/verify" && req.method === "POST") {
        const body = await readJson(req);
        const user = byEmail(norm(body.email));
        const token = String(body.token ?? "");
        const type = String(body.type ?? "");
        const viaConfirmation =
          (type === "email" || type === "signup") &&
          Boolean(token) &&
          user?.confirmationCode === token;
        const viaRecovery =
          (type === "email" || type === "magiclink" || type === "recovery") &&
          Boolean(token) &&
          user?.recoveryCode === token;
        if (!user || (!viaConfirmation && !viaRecovery)) {
          return error(403, "otp_expired", "Token has expired or is invalid");
        }
        if (viaRecovery && !user.confirmedAt) user.password = null;
        user.confirmedAt ??= new Date().toISOString();
        user.confirmationCode = null;
        user.recoveryCode = null;
        return reply(200, session(user));
      }

      if (path === "/token" && url.searchParams.get("grant_type") === "password") {
        const body = await readJson(req);
        const user = byEmail(norm(body.email));
        if (!user || !user.password || user.password !== body.password) {
          return error(400, "invalid_credentials", "Invalid login credentials");
        }
        if (!user.confirmedAt) {
          return error(400, "email_not_confirmed", "Email not confirmed");
        }
        return reply(200, session(user));
      }

      if (path === "/user" && req.method === "GET") {
        const user = users.get(sessions.get(bearer) ?? "");
        if (!user) return error(403, "bad_jwt", "invalid JWT");
        return reply(200, publicUser(user));
      }

      return error(404, "not_found", path);
    })().catch((cause: unknown) => {
      res.writeHead(500);
      res.end(String(cause));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    anonKey: ANON,
    serviceRoleKey: SERVICE,
    forcedConfirmations: () => forced,
    onOtpLookup: (hook) => {
      otpHook = hook;
    },
    raceNextAdminCreate: (email, password) => {
      adminRaces.set(norm(email), password);
    },
    latestCode: (email) => codes.get(norm(email)) ?? null,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
