"use client";

import { useEffect } from "react";
import {
  clearStoredNativeToken,
  setStoredNativeToken,
} from "@/lib/push/native-token-store";
import { checkDeviceIntegrity } from "@/lib/native/device-integrity";

/**
 * Capacitor shell bootstrap: status bar, splash, native push listeners.
 * No-op in the browser.
 */
export function CapacitorShell() {
  useEffect(() => {
    let removeListeners: (() => void) | undefined;

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const [{ StatusBar, Style }, { SplashScreen }, { PushNotifications }, { App }] =
          await Promise.all([
            import("@capacitor/status-bar"),
            import("@capacitor/splash-screen"),
            import("@capacitor/push-notifications"),
            import("@capacitor/app"),
          ]);

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: "#0a0a0a" }).catch(() => {});
        await SplashScreen.hide().catch(() => {});

        // Advisory root/jailbreak signal (non-blocking). See device-integrity.ts.
        void checkDeviceIntegrity().then((integrity) => {
          if (integrity.compromised) {
            console.warn(
              "[security] device integrity flagged:",
              integrity.reasons.join(", "),
            );
          }
        });

        const regHandle = await PushNotifications.addListener(
          "registration",
          (ev) => {
            if (ev.value) setStoredNativeToken(ev.value);
          },
        );

        const regErrHandle = await PushNotifications.addListener(
          "registrationError",
          () => {
            clearStoredNativeToken();
          },
        );

        const actionHandle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const url =
              (action.notification.data?.url as string | undefined) ?? "/welcome";
            window.location.href = url.startsWith("http")
              ? url
              : `${window.location.origin}${url}`;
          },
        );

        const appUrlHandle = await App.addListener("appUrlOpen", (event) => {
          if (event.url) window.location.href = event.url;
        });

        removeListeners = () => {
          void regHandle.remove();
          void regErrHandle.remove();
          void actionHandle.remove();
          void appUrlHandle.remove();
        };
      } catch {
        // Capacitor plugins unavailable — browser build
      }
    })();

    return () => removeListeners?.();
  }, []);

  return null;
}
