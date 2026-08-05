import { isNativePlatform } from "@/lib/native/platform";

export type HapticImpact = "light" | "medium" | "heavy";
export type HapticNotification = "success" | "warning" | "error";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Native-only tactile feedback. No-ops on web / when Capacitor Haptics
 * is unavailable / when the user prefers reduced motion.
 */
export async function hapticImpact(
  style: HapticImpact = "light",
): Promise<void> {
  if (prefersReducedMotion()) return;
  if (!(await isNativePlatform())) return;
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
  if (!(await isNativePlatform())) return;
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
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionChanged();
  } catch {
    /* plugin missing or unsupported */
  }
}
