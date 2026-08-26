import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

/**
 * Capacitor native shell for Kaify Ai.
 *
 * Store / default builds (`npm run cap:sync`): load audited local `native-dist`.
 * Only API calls leave the WebView — no production remote UI (ADR 007).
 *
 * Internal device QA against the full Next.js product:
 *   npm run cap:sync:test-web
 *   → WebView loads https://kaifyai.org (Maya, settings, analytics, etc.)
 * Do NOT ship App Store / Play builds from that sync.
 *
 * Local device against a LAN Next.dev:
 *   npm run cap:sync:dev
 */
const ALLOWED_TEST_WEBVIEW_URLS = new Set([
  "https://kaifyai.org",
  "https://www.kaifyai.org",
]);

function resolveCapacitorServerUrl(
  raw: string | undefined,
): string | undefined {
  const requested = raw?.trim().replace(/\/$/, "");
  if (!requested) return undefined;
  if (requested.startsWith("http://")) return requested;
  if (ALLOWED_TEST_WEBVIEW_URLS.has(requested)) return requested;
  return undefined;
}

const serverUrl = resolveCapacitorServerUrl(process.env.CAPACITOR_SERVER_URL);
const isLocalDevHttp = Boolean(serverUrl?.startsWith("http://"));
const isTestRemoteHttps = Boolean(serverUrl?.startsWith("https://"));

const config: CapacitorConfig = {
  appId: "org.kaify.app",
  appName: "Kaify Ai",
  webDir: "native-dist",
  loggingBehavior: isLocalDevHttp || isTestRemoteHttps ? "debug" : "none",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: isLocalDevHttp,
          androidScheme: "https",
        },
      }
    : {}),
  android: {
    allowMixedContent: isLocalDevHttp,
    webContentsDebuggingEnabled: isLocalDevHttp || isTestRemoteHttps,
  },
  ios: {
    webContentsDebuggingEnabled: isLocalDevHttp || isTestRemoteHttps,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0a",
    },
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
    },
  },
};

export default config;
