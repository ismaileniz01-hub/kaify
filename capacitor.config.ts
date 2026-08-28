import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

/**
 * Capacitor native shell for Kaify Ai.
 *
 * Store builds load the audited local `native-dist` bundle. Only API calls
 * leave the WebView. A dev server URL is accepted solely when explicitly set
 * by cap:sync:dev and is never included in production sync output.
 *
 * Sync before store builds:
 *   npm run cap:sync
 *
 * Local device against dev server:
 *   npm run cap:sync:dev
 */
const requestedServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const devServerUrl = requestedServerUrl?.startsWith("http://")
  ? requestedServerUrl
  : undefined;
const isLocal = Boolean(devServerUrl?.startsWith("http://"));

const config: CapacitorConfig = {
  appId: "org.kaifyai.app",
  appName: "Kaify Ai",
  webDir: "native-dist",
  loggingBehavior: isLocal ? "debug" : "none",
  // Android WebView origin is https://localhost (OTP CORS).
  // iOS keeps the default capacitor:// scheme — iosScheme: https crushes
  // WKWebView layout after the OTP keyboard. GoTrue is intercepted in-app.
  server: {
    androidScheme: "https",
    hostname: "localhost",
    allowNavigation: ["kaifyai.org", "www.kaifyai.org"],
    ...(devServerUrl
      ? {
          url: devServerUrl,
          cleartext: isLocal,
        }
      : {}),
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
