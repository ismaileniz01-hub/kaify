import {
  KEYBOARD_INSET_EVENT,
  currentKeyboardMeasurement,
  type KeyboardMeasurement,
} from "@/lib/native/keyboard-inset";

/** Space kept between the revealed content and the keyboard top. */
export const REVEAL_MARGIN_PX = 16;
/** Keeps the focused field below sticky headers when scrolling it up. */
export const REVEAL_TOP_CLEARANCE_PX = 72;

export type RevealInput = {
  fieldTop: number;
  fieldBottom: number;
  /** Primary action that should stay reachable (e.g. Save), if any. */
  ctaBottom: number | null;
  visibleTop: number;
  visibleBottom: number;
  margin?: number;
  topClearance?: number;
};

/**
 * Pixels to scroll (positive = content moves up) so the field — and its CTA
 * when both fit — end above the keyboard without pushing the field under the
 * header. Returns 0 when everything is already visible.
 */
export function computeRevealScroll(input: RevealInput): number {
  const margin = input.margin ?? REVEAL_MARGIN_PX;
  const topClearance = input.topClearance ?? REVEAL_TOP_CLEARANCE_PX;
  const minTop = input.visibleTop + topClearance;
  const maxBottom = input.visibleBottom - margin;
  const room = maxBottom - minTop;

  let bottom = input.fieldBottom;
  if (
    input.ctaBottom !== null &&
    input.ctaBottom > bottom &&
    input.ctaBottom - input.fieldTop <= room
  ) {
    bottom = input.ctaBottom;
  }

  if (input.fieldTop < minTop) {
    return Math.round(input.fieldTop - minTop);
  }
  if (bottom <= maxBottom) return 0;
  const wanted = bottom - maxBottom;
  const allowed = input.fieldTop - minTop;
  return Math.round(Math.max(0, Math.min(wanted, allowed)));
}

function isEditable(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === "TEXTAREA") return true;
  if (element.tagName !== "INPUT") return false;
  const type = (element as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "range", "file", "color"].includes(type);
}

function findCta(field: HTMLElement): HTMLElement | null {
  const scope = field.closest<HTMLElement>(
    "form, [role='dialog'], .login-otp-panel, [data-keyboard-scope], .phone-shell",
  );
  if (!scope) return null;
  const form =
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? field.form
      : null;
  return (
    scope.querySelector<HTMLElement>("[data-keyboard-cta]") ??
    form?.querySelector<HTMLElement>("button[type='submit']") ??
    null
  );
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const scrollable = /(auto|scroll)/.test(style.overflowY);
    if (scrollable && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function revealFocusedField(
  measurement: KeyboardMeasurement = currentKeyboardMeasurement(),
): void {
  if (!measurement.open) return;
  const field = document.activeElement;
  if (!isEditable(field)) return;
  if (field.closest("[data-keyboard-reveal='off']")) return;

  const fieldRect = field.getBoundingClientRect();
  const cta = findCta(field);
  const delta = computeRevealScroll({
    fieldTop: fieldRect.top,
    fieldBottom: fieldRect.bottom,
    ctaBottom: cta ? cta.getBoundingClientRect().bottom : null,
    visibleTop: measurement.visibleTop,
    visibleBottom: measurement.visibleBottom,
  });
  if (delta === 0) return;
  scrollParent(field)?.scrollBy({
    top: delta,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

function start(): () => void {
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    // Two frames: let keyboard-driven layout (padding, heights) settle first.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => revealFocusedField());
    });
  };
  const onInset = () => schedule();
  const onFocusIn = () => {
    if (currentKeyboardMeasurement().open) schedule();
  };
  window.addEventListener(KEYBOARD_INSET_EVENT, onInset);
  document.addEventListener("focusin", onFocusIn);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener(KEYBOARD_INSET_EVENT, onInset);
    document.removeEventListener("focusin", onFocusIn);
  };
}

let bindingCount = 0;
let teardown: (() => void) | null = null;

export function bindKeyboardReveal(): () => void {
  if (typeof window === "undefined") return () => undefined;
  bindingCount += 1;
  if (bindingCount === 1) teardown = start();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    bindingCount -= 1;
    if (bindingCount === 0) {
      teardown?.();
      teardown = null;
    }
  };
}
