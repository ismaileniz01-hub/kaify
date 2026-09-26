import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APP_VISIBLE_HEIGHT_VAR,
  KEYBOARD_INSET_EVENT,
  KEYBOARD_OFFSET_VAR,
  KEYBOARD_OPEN_ATTR,
  bindKeyboardInset,
  measureKeyboard,
  nextBaselineHeight,
  type KeyboardEventSource,
} from "@/lib/native/keyboard-inset";

const SCREEN = 844;
const KEYBOARD = 336;

describe("measureKeyboard", () => {
  it("is closed with no keyboard signals", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: 0,
      viewport: { height: SCREEN, offsetTop: 0, scale: 1 },
    });
    expect(m).toEqual({ inset: 0, visibleTop: 0, visibleBottom: SCREEN, open: false });
  });

  it("WKWebView keeps innerHeight: the plugin height sets the keyboard top once", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: KEYBOARD,
      viewport: { height: SCREEN - KEYBOARD, offsetTop: 0, scale: 1 },
    });
    expect(m.inset).toBe(KEYBOARD);
    expect(m.visibleBottom).toBe(SCREEN - KEYBOARD);
    expect(m.open).toBe(true);
  });

  it("WKWebView that also shrinks innerHeight is not subtracted twice", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN - KEYBOARD,
      pluginHeight: KEYBOARD,
      viewport: { height: SCREEN - KEYBOARD, offsetTop: 0, scale: 1 },
    });
    expect(m.inset).toBe(KEYBOARD);
    expect(m.visibleBottom).toBe(SCREEN - KEYBOARD);
  });

  it("iOS focus pan (offsetTop) does not hide the real keyboard top", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: KEYBOARD,
      viewport: { height: SCREEN - KEYBOARD, offsetTop: KEYBOARD, scale: 1 },
    });
    expect(m.visibleBottom).toBe(SCREEN - KEYBOARD);
    expect(m.visibleTop).toBe(KEYBOARD);
  });

  it("iOS pan without the plugin still counts the covered screen height", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: 0,
      viewport: { height: SCREEN - KEYBOARD, offsetTop: KEYBOARD, scale: 1 },
    });
    expect(m.visibleBottom).toBe(SCREEN - KEYBOARD);
    expect(m.inset).toBe(KEYBOARD);
    expect(m.open).toBe(true);
  });

  it("mobile Safari without the plugin reads the visual viewport", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: 0,
      viewport: { height: SCREEN - 300, offsetTop: 0, scale: 1 },
    });
    expect(m.inset).toBe(300);
    expect(m.open).toBe(true);
  });

  it("ignores the visual viewport while pinch-zoomed", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: 0,
      viewport: { height: 400, offsetTop: 120, scale: 2 },
    });
    expect(m.open).toBe(false);
    expect(m.inset).toBe(0);
  });

  it("treats a small accessory bar as closed", () => {
    const m = measureKeyboard({
      baselineHeight: SCREEN,
      layoutHeight: SCREEN,
      pluginHeight: 44,
      viewport: null,
    });
    expect(m.inset).toBe(44);
    expect(m.open).toBe(false);
  });
});

describe("nextBaselineHeight", () => {
  it("follows rotation while the keyboard is closed", () => {
    expect(
      nextBaselineHeight(SCREEN, {
        layoutHeight: 390,
        pluginHeight: 0,
        viewport: { height: 390, offsetTop: 0, scale: 1 },
      }),
    ).toBe(390);
  });

  it("holds while the plugin reports a keyboard", () => {
    expect(
      nextBaselineHeight(SCREEN, {
        layoutHeight: SCREEN - KEYBOARD,
        pluginHeight: KEYBOARD,
        viewport: null,
      }),
    ).toBe(SCREEN);
  });

  it("holds while the visual viewport is shortened by a keyboard", () => {
    expect(
      nextBaselineHeight(SCREEN, {
        layoutHeight: SCREEN,
        pluginHeight: 0,
        viewport: { height: SCREEN - 300, offsetTop: 0, scale: 1 },
      }),
    ).toBe(SCREEN);
  });
});

type Listener = (info: { keyboardHeight?: number }) => void;

function fakeDom() {
  const styles = new Map<string, string>();
  const attrs = new Set<string>();
  const events: Array<{ type: string; detail: unknown }> = [];
  const windowListeners = new Map<string, Set<() => void>>();
  const win = {
    innerHeight: SCREEN,
    visualViewport: null,
    addEventListener: (type: string, cb: () => void) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type)!.add(cb);
    },
    removeEventListener: (type: string, cb: () => void) => {
      windowListeners.get(type)?.delete(cb);
    },
    dispatchEvent: (event: CustomEvent) => {
      events.push({ type: event.type, detail: event.detail });
      return true;
    },
  };
  const doc = {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    documentElement: {
      style: {
        setProperty: (name: string, value: string) => styles.set(name, value),
        removeProperty: (name: string) => styles.delete(name),
      },
      setAttribute: (name: string) => attrs.add(name),
      removeAttribute: (name: string) => attrs.delete(name),
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  return { styles, attrs, events, windowListeners };
}

function fakeKeyboard() {
  const listeners = new Map<string, Listener>();
  let removed = 0;
  const source: KeyboardEventSource = {
    addListener: async (eventName, listener) => {
      listeners.set(eventName, listener);
      return {
        remove: () => {
          removed += 1;
          listeners.delete(eventName);
        },
      };
    },
  };
  return {
    source,
    fire: (eventName: string, keyboardHeight = 0) =>
      listeners.get(eventName)?.({ keyboardHeight }),
    listenerCount: () => listeners.size,
    removed: () => removed,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bindKeyboardInset", () => {
  it("publishes the inset, visible height and open flag from plugin events", async () => {
    const dom = fakeDom();
    const keyboard = fakeKeyboard();
    const release = bindKeyboardInset(async () => keyboard.source);
    await flush();

    keyboard.fire("keyboardWillShow", KEYBOARD);
    expect(dom.styles.get(KEYBOARD_OFFSET_VAR)).toBe(`${KEYBOARD}px`);
    expect(dom.styles.get(APP_VISIBLE_HEIGHT_VAR)).toBe(`${SCREEN - KEYBOARD}px`);
    expect(dom.attrs.has(KEYBOARD_OPEN_ATTR)).toBe(true);
    expect(dom.events.at(-1)?.type).toBe(KEYBOARD_INSET_EVENT);

    keyboard.fire("keyboardWillHide");
    expect(dom.styles.get(KEYBOARD_OFFSET_VAR)).toBe("0px");
    expect(dom.styles.has(APP_VISIBLE_HEIGHT_VAR)).toBe(false);
    expect(dom.attrs.has(KEYBOARD_OPEN_ATTR)).toBe(false);
    release();
  });

  it("shares one set of listeners and keeps them until the last release", async () => {
    const dom = fakeDom();
    const keyboard = fakeKeyboard();
    const releaseShell = bindKeyboardInset(async () => keyboard.source);
    const releasePage = bindKeyboardInset(async () => keyboard.source);
    await flush();
    expect(keyboard.listenerCount()).toBe(4);

    keyboard.fire("keyboardDidShow", KEYBOARD);
    releasePage();
    releasePage();
    // A page unmount must not zero the inset while the shell is still bound.
    expect(dom.styles.get(KEYBOARD_OFFSET_VAR)).toBe(`${KEYBOARD}px`);
    expect(keyboard.removed()).toBe(0);

    releaseShell();
    expect(keyboard.removed()).toBe(4);
    expect(dom.styles.get(KEYBOARD_OFFSET_VAR)).toBe("0px");
    expect(dom.windowListeners.get("resize")?.size ?? 0).toBe(0);
  });
});
