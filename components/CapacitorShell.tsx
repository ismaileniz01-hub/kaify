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
import { bindInAppNavigation } from "@/lib/native/in-app-navigation";
import { consumeAppBack } from "@/lib/native/app-back-stack";
import { useAppBackStack } from "@/hooks/useAppBackStack";

function setKeyboardOffset(px: number): void {
  document.documentElement.style.setProperty(
    "--keyboard-offset",
    `${Math.max(0, px)}px`,
  );
}

function statusBarStyleForTheme(): "DARK" | "LIGHT" {
  if (typeof document === "undefined") return "DARK";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "LIGHT"
    : "DARK";
}

/**
 * Capacitor native shell: status bar, splash, keyboard, push, deep links.
 * No-op in the browser — web development is unchanged.
 */
export function CapacitorShell() {
  useAppBackStack();

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

        const applyStatusBar = async () => {
          const light = statusBarStyleForTheme() === "LIGHT";
          await StatusBar.setStyle({
            style: light ? Style.Light : Style.Dark,
          }).catch(() => {});
          if (platform === "android") {
            await StatusBar.setBackgroundColor({
              color: light ? "#f5f5f5" : "#0a0a0a",
            }).catch(() => {});
          }
        };

        await applyStatusBar();
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

        await SplashScreen.hide().catch(() => {});

        await Keyboard.setResizeMode({
          mode: (await import("@capacitor/keyboard")).KeyboardResize.None,
        }).catch(() => {});

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

        const themeObserver = new MutationObserver(() => {
          void applyStatusBar();
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
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
                const action = consumeAppBack();
                if (action === "overlay") return;
                if (action === "back") {
                  window.history.back();
                  return;
                }
                void App.minimizeApp();
              })
            : undefined;

        const appStateHandle = await App.addListener(
          "appStateChange",
          (state) => {
            if (!state.isActive) return;
            void import("@/lib/native/health-steps").then((mod) =>
              mod.syncNativeHealthSteps().catch(() => undefined),
            );
          },
        );

        removeListeners = () => {
          unbindNavigation();
          themeObserver.disconnect();
          void keyboardShow.remove();
          void keyboardHide.remove();
          void regHandle.remove();
          void regErrHandle.remove();
          void actionHandle.remove();
          void appUrlHandle.remove();
          void appStateHandle.remove();
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
