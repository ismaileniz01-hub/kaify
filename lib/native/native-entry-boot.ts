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

/**
 * Runs from a nonce'd inline script so iOS WKWebView can establish cookies
 * before React hydrates. Keep this IIFE free of imports.
 */
export const NATIVE_ENTRY_BOOT_SCRIPT = `(function () {
  var status = document.getElementById("native-entry-status");
  var actions = document.getElementById("native-entry-actions");
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
  var retry = document.getElementById("native-entry-retry");
  if (retry) retry.addEventListener("click", function () { location.reload(); });
  var back = document.getElementById("native-entry-back");
  if (back) back.addEventListener("click", goShell);

  var params = new URLSearchParams(location.hash.replace(/^#/, ""));
  var accessToken = params.get("access_token");
  var refreshToken = params.get("refresh_token");
  history.replaceState(null, "", location.pathname);
  if (!accessToken || !refreshToken) {
    fail("Oturum bilgisi eksik. Uygulamayı kapatıp tekrar aç.");
    return;
  }
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
