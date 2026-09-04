import { afterEach, describe, expect, it } from "vitest";
import {
  ANDROID_BACK_EVENT,
  appBackDepth,
  consumeAppBack,
  markAppBackPop,
  noteAppPathChange,
  resetAppBackStackForTests,
} from "@/lib/native/app-back-stack";

describe("Android in-app back stack", () => {
  afterEach(() => {
    resetAppBackStackForTests();
  });

  it("pushes on forward path changes and pops only via history", () => {
    noteAppPathChange("/welcome", "/messages");
    expect(appBackDepth()).toBe(1);
    expect(consumeAppBack()).toBe("back");
    expect(appBackDepth()).toBe(1);

    markAppBackPop();
    expect(appBackDepth()).toBe(0);
    expect(consumeAppBack()).toBe("minimize");
  });

  it("ignores the path change that follows a history pop", () => {
    noteAppPathChange("/welcome", "/messages");
    markAppBackPop();
    noteAppPathChange("/messages", "/welcome");
    expect(appBackDepth()).toBe(0);
  });

  it("closes overlays before navigating back", () => {
    noteAppPathChange("/welcome", "/messages");
    const dispatched: string[] = [];
    const previousDocument = Reflect.get(globalThis, "document");
    const previousWindow = Reflect.get(globalThis, "window");
    Reflect.set(globalThis, "document", {
      querySelector: (sel: string) =>
        sel.includes("data-app-overlay") ? {} : null,
    });
    Reflect.set(globalThis, "window", {
      dispatchEvent: (event: Event) => {
        dispatched.push(event.type);
        return true;
      },
    });

    expect(consumeAppBack()).toBe("overlay");
    expect(dispatched).toContain(ANDROID_BACK_EVENT);
    expect(appBackDepth()).toBe(1);

    if (previousDocument === undefined) {
      Reflect.deleteProperty(globalThis, "document");
    } else {
      Reflect.set(globalThis, "document", previousDocument);
    }
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Reflect.set(globalThis, "window", previousWindow);
    }
  });
});
