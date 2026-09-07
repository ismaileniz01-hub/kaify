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
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(NATIVE_ENTRY_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: unknown };
    return typeof parsed.accessToken === "string" && parsed.accessToken.trim()
      ? parsed.accessToken.trim()
      : null;
  } catch {
    return null;
  }
}

export function consumeNativeEntryHandoff(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const handoff = sessionStorage.getItem(NATIVE_ENTRY_HANDOFF_KEY) === "1";
    if (handoff) sessionStorage.removeItem(NATIVE_ENTRY_HANDOFF_KEY);
    return handoff;
  } catch {
    return false;
  }
}

export function clearNativeEntryTokens(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(NATIVE_ENTRY_TOKEN_KEY);
    sessionStorage.removeItem(NATIVE_ENTRY_HANDOFF_KEY);
  } catch {
    // ignore
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
      var raw = sessionStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function saveStored(access, refresh) {
    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: access, refreshToken: refresh }));
      sessionStorage.setItem(HANDOFF_KEY, "1");
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
  history.replaceState(null, "", location.pathname);
  if (!accessToken || !refreshToken) {
    fail("Oturum bilgisi eksik. Uygulamayı kapatıp tekrar aç.");
    return;
  }
  saveStored(accessToken, refreshToken);
  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort();
    fail("Açılış uzun sürdü. Tekrar dene veya girişe dön.");
  }, ${NATIVE_ENTRY_TIMEOUT_MS});
  fetch("${NATIVE_ENTRY_ESTABLISH_PATH}", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ accessToken: accessToken, refreshToken: refreshToken }),
    signal: controller.signal
  }).then(function (res) {
    if (controller.signal.aborted) return;
    clearTimeout(timer);
    if (!res.ok) {
      fail("Oturum kaydedilemedi. Tekrar dene veya girişe dön.");
      return;
    }
    location.replace("${NATIVE_ENTRY_SUCCESS_PATH}");
  }).catch(function () {
    if (controller.signal.aborted) return;
    clearTimeout(timer);
    fail("Bağlantı hatası. Tekrar dene veya girişe dön.");
  });
})();`;
