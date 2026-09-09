/** Hash tokens stay in the browser; this boot script never sends them in the URL path. */
export const NATIVE_ENTRY_ESTABLISH_PATH = "/api/auth/session/establish";
export const NATIVE_ENTRY_COMPLETE_PATH = "/api/auth/session/native-complete";
export const NATIVE_ENTRY_SUCCESS_PATH = "/welcome";
export const NATIVE_HANDOFF_QUERY = "native_handoff";
export const NATIVE_ENTRY_TIMEOUT_MS = 12_000;
export const NATIVE_ENTRY_STATUS_ID = "native-entry-status";

export function parseNativeEntryHash(
  hash: string,
): { accessToken: string; refreshToken: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token")?.trim() ?? "";
  const refreshToken = params.get("refresh_token")?.trim() ?? "";
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/** Capacitor shells after a failed handoff — iOS must stay on capacitor://, not https. */
export function nativeEntryShellUrl(userAgent: string): string {
  if (/Android/i.test(userAgent)) return "https://localhost/?signed_out=1";
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "capacitor://localhost/?signed_out=1";
  }
  return "/login";
}

export const NATIVE_ENTRY_HANDOFF_KEY = "kaify-native-handoff";
export const NATIVE_ENTRY_TOKEN_KEY = "kaify-native-entry";
export const NATIVE_SESSION_HINT_COOKIE = "kaify_native_session";
/** Short-lived JS-readable bearer after native-consume — survives WKWebView hash drops. */
export const NATIVE_BEARER_COOKIE = "kaify_native_bearer";
export const NATIVE_BEARER_COOKIE_MAX_AGE_SEC = 120;
export const NATIVE_ENTRY_NAVIGATE_MS = 1_500;

/** Home after OTP. Query lets middleware skip guest redirect without Set-Cookie. */
export const NATIVE_WELCOME_HANDOFF_PATH = `${NATIVE_ENTRY_SUCCESS_PATH}?${NATIVE_HANDOFF_QUERY}=1`;

/** CSP hash of NATIVE_ENTRY_BOOT_SCRIPT so WKWebView can run it without a nonce race. */
export const NATIVE_ENTRY_BOOT_CSP_HASH =
  "sha256-8FHQQnrmGEZYMi8klN8ug8Y+0REq7qOXbi2JUhAm76Y=";

type NativeEntryTokens = { accessToken: string; refreshToken: string };

/** base64url(JSON) for Set-Cookie — avoids `;` / space breakage in WKWebView. */
export function encodeNativeBearerCookieValue(
  tokens: NativeEntryTokens,
): string {
  return Buffer.from(
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeBase64UrlJson(raw: string): NativeEntryTokens | null {
  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const json =
      typeof atob === "function"
        ? atob(normalized + pad)
        : Buffer.from(raw, "base64url").toString("utf8");
    return readStoredNativeEntry(json);
  } catch {
    return null;
  }
}

function readStoredNativeEntry(raw: string | null): NativeEntryTokens | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      accessToken?: unknown;
      refreshToken?: unknown;
    };
    const accessToken =
      typeof parsed.accessToken === "string" ? parsed.accessToken.trim() : "";
    const refreshToken =
      typeof parsed.refreshToken === "string" ? parsed.refreshToken.trim() : "";
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

function storageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

function writeNativeEntryTokens(tokens: NativeEntryTokens): void {
  const payload = JSON.stringify(tokens);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(NATIVE_ENTRY_TOKEN_KEY, payload);
      sessionStorage.setItem(NATIVE_ENTRY_HANDOFF_KEY, "1");
    } catch {
      // ignore
    }
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(NATIVE_ENTRY_TOKEN_KEY, payload);
      localStorage.setItem(NATIVE_ENTRY_HANDOFF_KEY, "1");
    } catch {
      // ignore
    }
  }
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

/**
 * Move the short-lived Set-Cookie bearer into origin storage, then clear the cookie.
 * Must run before the first /api/session call on Welcome.
 */
export function hydrateNativeBearerCookie(): boolean {
  const raw = readCookieValue(NATIVE_BEARER_COOKIE);
  if (!raw) return false;
  let decoded = decodeBase64UrlJson(raw);
  if (!decoded) {
    try {
      decoded = readStoredNativeEntry(decodeURIComponent(raw));
    } catch {
      decoded = null;
    }
  }
  clearCookie(NATIVE_BEARER_COOKIE);
  if (!decoded) return false;
  writeNativeEntryTokens(decoded);
  return true;
}

/** WKWebView still reports native after loading kaifyai.org. Never await getSession there. */
export function isCapacitorNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (typeof cap?.isNativePlatform === "function" && cap.isNativePlatform()) {
      return true;
    }
  } catch {
    // ignore
  }
  try {
    return document.documentElement.classList.contains("native-app");
  } catch {
    return false;
  }
}

export function readNativeEntrySession(): NativeEntryTokens | null {
  hydrateNativeBearerCookie();
  if (typeof sessionStorage !== "undefined") {
    const fromSession = readStoredNativeEntry(
      storageGet(sessionStorage, NATIVE_ENTRY_TOKEN_KEY),
    );
    if (fromSession) return fromSession;
  }
  if (typeof localStorage !== "undefined") {
    return readStoredNativeEntry(storageGet(localStorage, NATIVE_ENTRY_TOKEN_KEY));
  }
  return null;
}

export function readNativeEntryAccessToken(): string | null {
  return readNativeEntrySession()?.accessToken ?? null;
}

export function consumeNativeEntryHandoff(): boolean {
  hydrateNativeBearerCookie();
  let handoff = false;
  if (typeof sessionStorage !== "undefined") {
    handoff = storageGet(sessionStorage, NATIVE_ENTRY_HANDOFF_KEY) === "1";
    if (handoff) storageRemove(sessionStorage, NATIVE_ENTRY_HANDOFF_KEY);
  }
  if (typeof localStorage !== "undefined") {
    const local = storageGet(localStorage, NATIVE_ENTRY_HANDOFF_KEY) === "1";
    if (local) storageRemove(localStorage, NATIVE_ENTRY_HANDOFF_KEY);
    handoff = handoff || local;
  }
  return handoff;
}

export function clearNativeEntryTokens(): void {
  if (typeof sessionStorage !== "undefined") {
    storageRemove(sessionStorage, NATIVE_ENTRY_TOKEN_KEY);
    storageRemove(sessionStorage, NATIVE_ENTRY_HANDOFF_KEY);
  }
  if (typeof localStorage !== "undefined") {
    storageRemove(localStorage, NATIVE_ENTRY_TOKEN_KEY);
    storageRemove(localStorage, NATIVE_ENTRY_HANDOFF_KEY);
  }
  clearCookie(NATIVE_SESSION_HINT_COOKIE);
  clearCookie(NATIVE_BEARER_COOKIE);
}

export function hasNativeSessionHintCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) =>
    part.trim().startsWith(`${NATIVE_SESSION_HINT_COOKIE}=`),
  );
}

export function hasNativeBearerCookie(): boolean {
  return Boolean(readCookieValue(NATIVE_BEARER_COOKIE));
}

export function hasNativeHandoffQuery(search = ""): boolean {
  try {
    const raw = search || (typeof window === "undefined" ? "" : window.location.search);
    return new URLSearchParams(raw.replace(/^\?/, "")).get(NATIVE_HANDOFF_QUERY) === "1";
  } catch {
    return false;
  }
}

/**
 * iOS WebView after OTP: tokens in storage, hint cookie, or handoff query.
 * Capacitor.isNativePlatform() is often missing on kaifyai.org allowNavigation.
 */
export function hasNativeHandoffClient(): boolean {
  if (typeof window === "undefined") return false;
  hydrateNativeBearerCookie();
  if (isCapacitorNativeShell()) return true;
  if (readNativeEntryAccessToken()) return true;
  if (hasNativeSessionHintCookie()) return true;
  if (hasNativeBearerCookie()) return true;
  return hasNativeHandoffQuery();
}

/**
 * Immediate Home handoff. Do not fetch or form-POST — WKWebView drops those
 * cookies and the wait leaves users on "Kaify açılıyor". Keep this IIFE import-free.
 */
export const NATIVE_ENTRY_BOOT_SCRIPT = `(function () {
  var status = document.getElementById("native-entry-status");
  var actions = document.getElementById("native-entry-actions");
  var TOKEN_KEY = "${NATIVE_ENTRY_TOKEN_KEY}";
  var HANDOFF_KEY = "${NATIVE_ENTRY_HANDOFF_KEY}";
  var HINT = "${NATIVE_SESSION_HINT_COOKIE}";
  var BEARER = "${NATIVE_BEARER_COOKIE}";
  function fail(msg) {
    if (status) {
      status.textContent = msg;
      status.setAttribute("role", "alert");
      status.className = "text-sm text-red-200";
    }
    if (actions) actions.hidden = false;
  }
  function goShell() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) location.replace("https://localhost/?signed_out=1");
    else if (/iPhone|iPad|iPod/i.test(ua)) location.replace("capacitor://localhost/?signed_out=1");
    else location.replace("/login");
  }
  function readCookie(name) {
    var prefix = name + "=";
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var trimmed = parts[i].trim();
      if (trimmed.indexOf(prefix) === 0) return trimmed.slice(prefix.length);
    }
    return "";
  }
  function clearCookie(name) {
    document.cookie = name + "=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  }
  function decodeBearer(raw) {
    if (!raw) return null;
    try {
      var normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
      var pad = normalized.length % 4 === 0 ? "" : Array(5 - normalized.length % 4).join("=");
      var json = atob(normalized + pad);
      return JSON.parse(json);
    } catch (e) {
      try {
        return JSON.parse(decodeURIComponent(raw));
      } catch (e2) {
        return null;
      }
    }
  }
  function readStored() {
    try {
      var raw = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function saveStored(access, refresh) {
    var payload = JSON.stringify({ accessToken: access, refreshToken: refresh });
    try {
      sessionStorage.setItem(TOKEN_KEY, payload);
      sessionStorage.setItem(HANDOFF_KEY, "1");
    } catch (e) {}
    try {
      localStorage.setItem(TOKEN_KEY, payload);
      localStorage.setItem(HANDOFF_KEY, "1");
    } catch (e) {}
  }
  var retry = document.getElementById("native-entry-retry");
  if (retry) retry.addEventListener("click", function () { location.reload(); });
  var back = document.getElementById("native-entry-back");
  if (back) back.addEventListener("click", goShell);

  var params = new URLSearchParams(location.hash.replace(/^#/, ""));
  var accessToken = params.get("access_token") || "";
  var refreshToken = params.get("refresh_token") || "";
  if (!accessToken || !refreshToken) {
    var fromCookie = decodeBearer(readCookie(BEARER));
    if (fromCookie) {
      accessToken = fromCookie.accessToken || "";
      refreshToken = fromCookie.refreshToken || "";
      clearCookie(BEARER);
    }
  }
  if (!accessToken || !refreshToken) {
    var stored = readStored();
    if (stored) {
      accessToken = stored.accessToken || "";
      refreshToken = stored.refreshToken || "";
    }
  }
  if (!accessToken || !refreshToken) {
    fail("Oturum bilgisi eksik. Uygulamayı kapatıp tekrar aç.");
    return;
  }
  saveStored(accessToken, refreshToken);
  try {
    document.cookie = HINT + "=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure";
  } catch (e) {}
  location.replace("${NATIVE_WELCOME_HANDOFF_PATH}");
})();`.replace(/\r\n/g, "\n");
