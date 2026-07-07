"use client";

import { useEffect } from "react";
import {
  clearStoredNativeToken,
  setStoredNativeToken,
} from "@/lib/push/native-token-store";
import { checkDeviceIntegrity } from "@/lib/native/device-integrity";
import { navigateAppUrl } from "@/lib/native/deep-links";
import {
  clearNativeAppRoot,
  getNativePlatform,
  markNativeAppRoot,
} from "@/lib/native/platform";
import { warmUpNativeSpeechPermissions } from "@/lib/native/speech-platform";
import { bindInAppNavigation } from "@/lib/native/in-app-navigation";

function setKeyboardOffset(px: number): void {
  document.documentElement.style.setProperty(
    "--keyboard-offset",
    `${Math.max(0, px)}px`,
  );
}

/**
 * Capacitor native shell: status bar, splash, keyboard, push, deep links.
 * No-op in the browser — web development is unchanged.
 */
export function CapacitorShell() {
  useEffect(() => {
    let removeListeners: (() => void) | undefined;

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const platform = await getNativePlatform();
        markNativeAppRoot(platform);
        const unbindNavigation = bindInAppNavigation();

        const [
          { StatusBar, Style },
          { SplashScreen },
          { PushNotifications },
          { App },
          { Keyboard },
        ] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/push-notifications"),
          import("@capacitor/app"),
          import("@capacitor/keyboard"),
        ]);

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        if (platform === "android") {
          await StatusBar.setBackgroundColor({ color: "#0a0a0a" }).catch(
            () => {},
          );
        }
        if (platform === "ios") {
          await StatusBar.setOverlaysWebView({ overlay: true }).catch(
            () => {},
          );
        }

        await SplashScreen.hide().catch(() => {});

        await Keyboard.setResizeMode({
          mode: (await import("@capacitor/keyboard")).KeyboardResize.None,
        }).catch(() => {});

        void warmUpNativeSpeechPermissions();

        void checkDeviceIntegrity().then((integrity) => {
          if (integrity.compromised) {
            console.warn(
              "[security] device integrity flagged:",
              integrity.reasons.join(", "),
            );
          }
        });

        const keyboardShow = await Keyboard.addListener(
          "keyboardWillShow",
          (info) => setKeyboardOffset(info.keyboardHeight),
        );
        const keyboardHide = await Keyboard.addListener("keyboardWillHide", () =>
          setKeyboardOffset(0),
        );

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
              (action.notification.data?.url as string | undefined) ??
              "/welcome";
            navigateAppUrl(url);
          },
        );

        const appUrlHandle = await App.addListener("appUrlOpen", (event) => {
          if (event.url) navigateAppUrl(event.url);
        });

        const backHandle =
          platform === "android"
            ? await App.addListener("backButton", () => {
                if (window.history.length > 1) {
                  window.history.back();
                  return;
                }
                void App.minimizeApp();
              })
            : undefined;

        removeListeners = () => {
          unbindNavigation();
          void keyboardShow.remove();
          void keyboardHide.remove();
          void regHandle.remove();
          void regErrHandle.remove();
          void actionHandle.remove();
          void appUrlHandle.remove();
          void backHandle?.remove();
          setKeyboardOffset(0);
          clearNativeAppRoot();
        };
      } catch {
        // Capacitor plugins unavailable — browser build
      }
    })();

    return () => removeListeners?.();
  }, []);

  return null;
}
