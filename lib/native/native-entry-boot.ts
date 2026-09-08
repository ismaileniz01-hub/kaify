/** Hash tokens stay in the browser; this boot script never sends them in the URL path. */
export const NATIVE_ENTRY_ESTABLISH_PATH = "/api/auth/session/establish";
export const NATIVE_ENTRY_COMPLETE_PATH = "/api/auth/session/native-complete";
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
  if (typeof document !== "undefined") {
    document.cookie = `${NATIVE_SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  }
}

export function hasNativeSessionHintCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) =>
    part.trim().startsWith(`${NATIVE_SESSION_HINT_COOKIE}=`),
  );
}

/**
 * Same-origin document POST. WKWebView keeps Set-Cookie on this navigation;
 * it does not reliably keep Set-Cookie from fetch(). Keep this IIFE import-free.
 */
export const NATIVE_ENTRY_BOOT_SCRIPT = `(function () {
  var status = document.getElementById("native-entry-status");
  var actions = document.getElementById("native-entry-actions");
  var TOKEN_KEY = "${NATIVE_ENTRY_TOKEN_KEY}";
  var HANDOFF_KEY = "${NATIVE_ENTRY_HANDOFF_KEY}";
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
  if (!accessToken || !refreshToken) {
    fail("Oturum bilgisi eksik. Uygulamayı kapatıp tekrar aç.");
    return;
  }
  saveStored(accessToken, refreshToken);
  var form = document.createElement("form");
  form.method = "POST";
  form.enctype = "application/x-www-form-urlencoded";
  form.action = "${NATIVE_ENTRY_COMPLETE_PATH}";
  form.setAttribute("accept-charset", "UTF-8");
  function addField(name, value) {
    var input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  addField("accessToken", accessToken);
  addField("refreshToken", refreshToken);
  document.body.appendChild(form);
  form.submit();
})();`;

