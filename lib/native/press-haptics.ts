import { hapticImpact } from "@/lib/native/haptics";

const PRESSABLE =
  "button, a, select, summary, label, [role='button'], [role='tab'], [role='menuitem'], input[type='checkbox'], input[type='radio'], input[type='submit'], input[type='button']";

/** Light tap on every control so the installed app does not feel silent. */
export function bindPressHaptics(): () => void {
  if (typeof document === "undefined") return () => undefined;

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const hit = target.closest(PRESSABLE);
    if (!hit) return;
    if (hit.hasAttribute("disabled") || hit.getAttribute("aria-disabled") === "true") return;
    void hapticImpact("light");
  };

  document.addEventListener("pointerdown", onPointerDown, { passive: true });
  return () => document.removeEventListener("pointerdown", onPointerDown);
}
