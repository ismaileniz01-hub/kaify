import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getMotionBudget,
  particleCount,
  prefersReducedMotion,
  isLowEndDevice,
} from "@/lib/motion/perf-guards";

function stubWindow(matchesReduced: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchesReduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("window", { matchMedia });
  return matchMedia;
}

function stubNavigator(opts: { deviceMemory?: number; hardwareConcurrency?: number }) {
  vi.stubGlobal("navigator", {
    deviceMemory: opts.deviceMemory ?? 8,
    hardwareConcurrency: opts.hardwareConcurrency ?? 8,
  });
}

describe("perf-guards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    stubWindow(false);
    stubNavigator({});
  });

  it("detects reduced motion", () => {
    stubWindow(true);
    stubNavigator({});

    expect(prefersReducedMotion()).toBe(true);
    expect(getMotionBudget().effects).toBe(false);
    expect(particleCount(20)).toBe(0);
  });

  it("scales particles on low-end devices", () => {
    stubWindow(false);
    stubNavigator({ deviceMemory: 2 });

    expect(isLowEndDevice()).toBe(true);
    expect(particleCount(20)).toBe(7);
  });
});
