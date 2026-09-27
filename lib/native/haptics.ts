import { isNativePlatform } from "@/lib/native/platform";

export type HapticImpact = "light" | "medium" | "heavy";
export type HapticNotification = "success" | "warning" | "error";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let hapticCapability: boolean | null = null;
let lastTapAt = 0;

/** Installed app, including kaifyai.org inside the WebView where the plugin flag is late. */
function nativeShellHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (/KaifyNative/i.test(navigator.userAgent)) return true;
    if (document.documentElement.classList.contains("native-app")) return true;
    const cap = (
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
  } catch {
    return false;
  }
}

async function canUseHaptics(): Promise<boolean> {
  if (hapticCapability !== null) return hapticCapability;
  if (nativeShellHint()) {
    hapticCapability = true;
    return true;
  }
  hapticCapability = await isNativePlatform();
  return hapticCapability;
}

/** Collapse a pointerdown impact and the button's own selection into one tap. */
function absorbTap(): boolean {
  const now = Date.now();
  if (now - lastTapAt < 80) return true;
  lastTapAt = now;
  return false;
}

/**
 * Native-only tactile feedback. No-ops on web / when Capacitor Haptics
 * is unavailable / when the user prefers reduced motion.
 */
export async function hapticImpact(
  style: HapticImpact = "light",
): Promise<void> {
  if (prefersReducedMotion()) return;
  if (absorbTap()) return;
  if (!(await canUseHaptics())) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const;
    await Haptics.impact({ style: map[style] });
  } catch {
    /* plugin missing or unsupported */
  }
}

export async function hapticNotification(
  type: HapticNotification = "success",
): Promise<void> {
  if (prefersReducedMotion()) return;
  if (!(await canUseHaptics())) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    } as const;
    await Haptics.notification({ type: map[type] });
  } catch {
    /* plugin missing or unsupported */
  }
}

export async function hapticSelection(): Promise<void> {
  if (prefersReducedMotion()) return;
  if (absorbTap()) return;
  if (!(await canUseHaptics())) return;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionChanged();
  } catch {
    /* plugin missing or unsupported */
  }
}
