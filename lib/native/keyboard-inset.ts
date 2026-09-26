/**
 * Single source of truth for the on-screen keyboard (Capacitor runs with
 * KeyboardResize.None, so the WebView never shrinks on its own).
 *
 * Publishes on <html>:
 * - `--keyboard-offset`: px of the full-height layout hidden by the keyboard
 * - `--app-visible-height`: px from the top of the layout to the keyboard top
 *   (only while the keyboard is open; CSS falls back to 100dvh)
 * - `data-keyboard-open`: present while the keyboard is open
 * and dispatches KEYBOARD_INSET_EVENT on window whenever the inset changes.
 */

export const KEYBOARD_OPEN_ATTR = "data-keyboard-open";
export const KEYBOARD_INSET_EVENT = "kaify:keyboard-inset";
export const KEYBOARD_OFFSET_VAR = "--keyboard-offset";
export const APP_VISIBLE_HEIGHT_VAR = "--app-visible-height";

/** Below this the keyboard counts as closed (iOS accessory bar, rounding). */
export const KEYBOARD_OPEN_THRESHOLD_PX = 60;

export type ViewportSnapshot = {
  height: number;
  offsetTop: number;
  scale: number;
};

export type KeyboardMeasureInput = {
  /** Layout height with the keyboard closed (full WebView height). */
  baselineHeight: number;
  /** Current window.innerHeight — shrinks on some WKWebView builds. */
  layoutHeight: number;
  /** Capacitor keyboardHeight (0 when closed or unavailable). */
  pluginHeight: number;
  viewport: ViewportSnapshot | null;
};

export type KeyboardMeasurement = {
  inset: number;
  visibleTop: number;
  visibleBottom: number;
  open: boolean;
};

/**
 * Keyboard top = the smallest of: plugin-reported top, visual viewport bottom,
 * current layout height. Correct whether or not the WebView also shrinks
 * innerHeight/100dvh, so nothing is subtracted twice.
 */
export function measureKeyboard(input: KeyboardMeasureInput): KeyboardMeasurement {
  const baseline = Math.max(0, input.baselineHeight);
  const candidates = [baseline, Math.max(0, input.layoutHeight)];
  if (input.pluginHeight > 0) {
    candidates.push(baseline - input.pluginHeight);
  }
  const viewport = input.viewport;
  const zoomed = viewport ? Math.abs(viewport.scale - 1) > 0.01 : false;
  let visibleTop = 0;
  if (viewport && !zoomed) {
    visibleTop = Math.max(0, viewport.offsetTop);
    candidates.push(viewport.offsetTop + viewport.height);
  }
  const visibleBottom = Math.max(0, Math.round(Math.min(...candidates)));
  const inset = Math.max(0, Math.round(baseline - visibleBottom));
  return {
    inset,
    visibleTop: Math.round(visibleTop),
    visibleBottom,
    open: inset >= KEYBOARD_OPEN_THRESHOLD_PX,
  };
}

/**
 * Baseline tracks the closed-keyboard layout height (rotation, split view).
 * Only updated while nothing indicates an open keyboard.
 */
export function nextBaselineHeight(
  previous: number,
  input: Omit<KeyboardMeasureInput, "baselineHeight">,
): number {
  if (input.pluginHeight > 0) return previous;
  const viewport = input.viewport;
  if (viewport && Math.abs(viewport.scale - 1) <= 0.01) {
    const hidden = input.layoutHeight - (viewport.offsetTop + viewport.height);
    if (hidden >= KEYBOARD_OPEN_THRESHOLD_PX) return previous;
  }
  return input.layoutHeight > 0 ? input.layoutHeight : previous;
}

type ListenerHandle = { remove: () => Promise<void> | void };

export type KeyboardEventSource = {
  addListener(
    eventName:
      | "keyboardWillShow"
      | "keyboardDidShow"
      | "keyboardWillHide"
      | "keyboardDidHide",
    listener: (info: { keyboardHeight?: number }) => void,
  ): Promise<ListenerHandle>;
};

export type KeyboardSourceLoader = () => Promise<KeyboardEventSource | null>;

async function loadCapacitorKeyboard(): Promise<KeyboardEventSource | null> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    return Keyboard as unknown as KeyboardEventSource;
  } catch {
    return null;
  }
}

let published: KeyboardMeasurement = {
  inset: 0,
  visibleTop: 0,
  visibleBottom: 0,
  open: false,
};

export function currentKeyboardMeasurement(): KeyboardMeasurement {
  return published;
}

function publish(next: KeyboardMeasurement): void {
  const prev = published;
  published = next;
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty(KEYBOARD_OFFSET_VAR, `${next.inset}px`);
  if (next.open) {
    root.style.setProperty(APP_VISIBLE_HEIGHT_VAR, `${next.visibleBottom}px`);
    root.setAttribute(KEYBOARD_OPEN_ATTR, "");
  } else {
    root.style.removeProperty(APP_VISIBLE_HEIGHT_VAR);
    root.removeAttribute(KEYBOARD_OPEN_ATTR);
  }
  if (
    prev.inset !== next.inset ||
    prev.open !== next.open ||
    prev.visibleBottom !== next.visibleBottom
  ) {
    window.dispatchEvent(
      new CustomEvent(KEYBOARD_INSET_EVENT, { detail: next }),
    );
  }
}

function readViewport(): ViewportSnapshot | null {
  const viewport = window.visualViewport;
  if (!viewport) return null;
  return {
    height: viewport.height,
    offsetTop: viewport.offsetTop,
    scale: viewport.scale,
  };
}

function start(loadSource: KeyboardSourceLoader): () => void {
  let stopped = false;
  let pluginHeight = 0;
  let baseline = window.innerHeight;
  const handles: ListenerHandle[] = [];

  const sync = () => {
    if (stopped) return;
    const layoutHeight = window.innerHeight;
    const viewport = readViewport();
    baseline = nextBaselineHeight(baseline, { layoutHeight, pluginHeight, viewport });
    publish(
      measureKeyboard({ baselineHeight: baseline, layoutHeight, pluginHeight, viewport }),
    );
  };

  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", sync);
  viewport?.addEventListener("scroll", sync);
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);

  void loadSource().then(async (source) => {
    if (!source || stopped) return;
    const onShow = (info: { keyboardHeight?: number }) => {
      pluginHeight = Math.max(0, info?.keyboardHeight ?? 0);
      sync();
    };
    const onHide = () => {
      pluginHeight = 0;
      sync();
    };
    const add = async (
      eventName: Parameters<KeyboardEventSource["addListener"]>[0],
      listener: (info: { keyboardHeight?: number }) => void,
    ) => {
      try {
        const handle = await source.addListener(eventName, listener);
        if (stopped) void handle.remove();
        else handles.push(handle);
      } catch {
        // Plugin missing on web builds.
      }
    };
    await add("keyboardWillShow", onShow);
    await add("keyboardDidShow", onShow);
    await add("keyboardWillHide", onHide);
    await add("keyboardDidHide", onHide);
  });

  sync();

  return () => {
    stopped = true;
    viewport?.removeEventListener("resize", sync);
    viewport?.removeEventListener("scroll", sync);
    window.removeEventListener("resize", sync);
    window.removeEventListener("orientationchange", sync);
    for (const handle of handles) void handle.remove();
    publish({ inset: 0, visibleTop: 0, visibleBottom: window.innerHeight, open: false });
  };
}

let bindingCount = 0;
let teardown: (() => void) | null = null;

/**
 * Ref-counted: the app shell and page hooks can all bind; listeners exist once
 * and a page unmount never zeroes the inset while the shell is still bound.
 */
export function bindKeyboardInset(
  loadSource: KeyboardSourceLoader = loadCapacitorKeyboard,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  bindingCount += 1;
  if (bindingCount === 1) teardown = start(loadSource);
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
