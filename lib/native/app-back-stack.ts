export const ANDROID_BACK_EVENT = "kaify:android-back";

let depth = 0;
let popping = false;

export function resetAppBackStackForTests(): void {
  depth = 0;
  popping = false;
}

export function appBackDepth(): number {
  return depth;
}

export function markAppBackPop(): void {
  popping = true;
  depth = Math.max(0, depth - 1);
}

export function noteAppPathChange(previous: string, next: string): void {
  if (!previous || previous === next) return;
  if (popping) {
    popping = false;
    return;
  }
  depth += 1;
}

export function consumeAppBack(): "overlay" | "back" | "minimize" {
  if (typeof document !== "undefined") {
    const overlay = document.querySelector("[data-app-overlay='open']");
    if (overlay) {
      window.dispatchEvent(new Event(ANDROID_BACK_EVENT));
      return "overlay";
    }
  }
  if (depth > 0) return "back";
  return "minimize";
}
