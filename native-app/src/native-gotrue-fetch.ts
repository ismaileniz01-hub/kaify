import { NATIVE_CLIENT_VERSION } from "./client-version";
import { userFromAccessToken } from "./jwt";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function headerValue(
  headers: HeadersInit | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  return new Headers(headers).get(name);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isGoTruePath(url: string, fragment: string): boolean {
  return url.includes("/auth/v1/") && url.includes(fragment);
}

async function readRefreshToken(init?: RequestInit): Promise<string> {
  const raw = init?.body;
  if (!raw || typeof raw !== "string") return "";
  try {
    const parsed = JSON.parse(raw) as {
      refresh_token?: unknown;
      refreshToken?: unknown;
    };
    if (typeof parsed.refresh_token === "string") return parsed.refresh_token;
    if (typeof parsed.refreshToken === "string") return parsed.refreshToken;
  } catch {
    return "";
  }
  return "";
}

async function refreshViaKaify(init?: RequestInit): Promise<Response> {
  const refreshToken = await readRefreshToken(init);
  if (!refreshToken) {
    return jsonResponse({ message: "Missing refresh token." }, 400);
  }
  let response: Response;
  try {
    response = await fetch(`${__KAIFY_API_BASE__}/api/auth/session/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Version": NATIVE_CLIENT_VERSION,
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return jsonResponse({ message: "Session refresh unavailable." }, 503);
  }
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: {
      session?: {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
        user?: unknown;
      };
    };
  } | null;
  const session = payload?.data?.session;
  if (!response.ok || !session?.accessToken || !session.refreshToken) {
    return jsonResponse({ message: "Session refresh failed." }, response.status || 401);
  }
  return jsonResponse(
    {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_in: session.expiresIn ?? 3600,
      token_type: "bearer",
      user: session.user ?? userFromAccessToken(session.accessToken),
    },
    200,
  );
}

/**
 * WKWebView treats CORS `*` from capacitor:// as a TypeError ("Load failed").
 * Never let supabase-js call GoTrue in the WebView — answer locally or via Kaify.
 */
export async function nativeGoTrueFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = requestUrl(input);
  const method = (init?.method ?? "GET").toUpperCase();

  if (isGoTruePath(url, "/user") && method === "GET") {
    const auth = headerValue(init?.headers, "Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const user = token ? userFromAccessToken(token) : null;
    if (user) return jsonResponse(user, 200);
    return jsonResponse({ message: "Invalid access token." }, 401);
  }

  if (isGoTruePath(url, "/token") && method === "POST") {
    return refreshViaKaify(init);
  }

  if (isGoTruePath(url, "/logout") && method === "POST") {
    return jsonResponse({}, 204);
  }

  try {
    return await fetch(input, init);
  } catch {
    return jsonResponse({ message: "Network request failed." }, 503);
  }
}
