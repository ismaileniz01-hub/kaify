import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { resolveNativeServerUrl } from "./lib/native/app-entry";

/**
 * Capacitor native shell for K.AIFY.
 *
 * **Remote URL mode** — WebView loads the deployed Next.js app (Vercel).
 * Web and native share one codebase; Vercel deploy updates the app UI without
 * a store resubmit. Native plugins (push, speech, keyboard) run in the shell.
 *
 * Sync before store builds:
 *   npm run cap:sync:prod
 *
 * Local device against dev server:
 *   npm run cap:sync:dev
 */
const serverUrl = resolveNativeServerUrl();
const isLocal = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "org.kaify.app",
  appName: "K.AIFY",
  webDir: "public",
  loggingBehavior: isLocal ? "debug" : "none",
  server: {
    url: serverUrl,
    cleartext: isLocal,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: isLocal,
    webContentsDebuggingEnabled: isLocal,
  },
  ios: {
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
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
    },
  },
};

export default config;
