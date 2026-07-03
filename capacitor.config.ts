import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor native shell for K.AIFY.
 *
 * This Next.js app uses API routes and SSR, so we run in **remote URL mode**:
 * the WebView loads your deployed backend (Vercel). Native plugins (push, splash,
 * status bar) still run in the shell.
 *
 * Local dev: set CAPACITOR_SERVER_URL=http://10.0.2.2:3000 (Android emulator)
 * or your LAN IP for a physical device, then `npm run cap:sync`.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://kaify.org";

const isLocal = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "org.kaify.app",
  appName: "K.AIFY",
  webDir: "public",
  // Silence native logs in production; only verbose in local dev.
  loggingBehavior: isLocal ? "debug" : "none",
  server: {
    url: serverUrl,
    cleartext: isLocal,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: isLocal,
    // Never expose the remote WebView to Chrome DevTools inspection in release.
    webContentsDebuggingEnabled: isLocal,
  },
  ios: {
    // Block WKWebView remote inspection in release builds.
    webContentsDebuggingEnabled: isLocal,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0a",
    },
  },
};

export default config;
