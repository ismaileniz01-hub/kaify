/** Hash tokens stay in the browser; this boot script never sends them in the URL path. */
export const NATIVE_ENTRY_ESTABLISH_PATH = "/api/auth/session/establish";
export const NATIVE_ENTRY_SUCCESS_PATH = "/welcome";
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
export const NATIVE_ENTRY_NAVIGATE_MS = 1_500;

function readStoredNativeEntry(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { accessToken?: unknown };
    return typeof parsed.accessToken === "string" && parsed.accessToken.trim()
      ? parsed.accessToken.trim()
      : null;
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

export function readNativeEntryAccessToken(): string | null {
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

export function consumeNativeEntryHandoff(): boolean {
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
}

/**
 * Runs from a nonce'd inline script so iOS WKWebView can establish cookies
 * before React hydrates. Keep this IIFE free of imports.
 */
export const NATIVE_ENTRY_BOOT_SCRIPT = `(function () {
  var status = document.getElementById("native-entry-status");
  var actions = document.getElementById("native-entry-actions");
  var TOKEN_KEY = "${NATIVE_ENTRY_TOKEN_KEY}";
  var HANDOFF_KEY = "${NATIVE_ENTRY_HANDOFF_KEY}";
  var HINT_COOKIE = "${NATIVE_SESSION_HINT_COOKIE}";
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
  function markNativeSession() {
    try {
      document.cookie = HINT_COOKIE + "=1; Path=/; Max-Age=2592000; Secure; SameSite=Lax";
    } catch (e) {}
  }
  var navigated = false;
  function goWelcome() {
    if (navigated) return;
    navigated = true;
    markNativeSession();
    location.replace("${NATIVE_ENTRY_SUCCESS_PATH}");
  }
  var retry = document.getElementById("native-entry-retry");
  if (retry) retry.addEventListener("click", function () { location.reload(); });
  var back = document.getElementById("native-entry-back");
  if (back) back.addEventListener("click", goShell);

  var params = new URLSearchParams(location.hash.replace(/^#/, ""));
  var accessToken = params.get("access_token") || "";
  var refreshToken = params.get("refresh_token") || "";
  if (!accessToken || !refreshToken) {
    var stored = readStored();
    if (stored) {
      accessToken = stored.accessToken || "";
      refreshToken = stored.refreshToken || "";
    }
  }
  history.replaceState(null, "", location.pathname);
  if (!accessToken || !refreshToken) {
    fail("Oturum bilgisi eksik. Uygulamayı kapatıp tekrar aç.");
    return;
  }
  saveStored(accessToken, refreshToken);
  markNativeSession();
  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort();
    goWelcome();
  }, ${NATIVE_ENTRY_NAVIGATE_MS});
  fetch("${NATIVE_ENTRY_ESTABLISH_PATH}", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ accessToken: accessToken, refreshToken: refreshToken }),
    signal: controller.signal
  }).then(function () {
    clearTimeout(timer);
    goWelcome();
  }).catch(function () {
    clearTimeout(timer);
    goWelcome();
  });
})();`;
