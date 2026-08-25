import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

/**
 * Capacitor native shell for Kaify Ai.
 *
 * Store builds load the static Next.js export bundled in `out/`. A remote
 * server URL is accepted only when explicitly supplied for local live reload.
 */
const liveReloadUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const isLiveReload = Boolean(liveReloadUrl);
const nativeStartFile = "/login/index.html";

const config: CapacitorConfig = {
  appId: 'org.kaifyai.app',
  appName: "Kaify Ai",
  webDir: "out",
  loggingBehavior: isLiveReload ? "debug" : "none",
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: liveReloadUrl.startsWith("http://"),
        androidScheme: "https",
      }
    : {
        appStartPath: nativeStartFile,
      },
  android: {
    allowMixedContent: isLiveReload,
    webContentsDebuggingEnabled: isLiveReload,
  },
  ios: {
    webContentsDebuggingEnabled: isLiveReload,
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
