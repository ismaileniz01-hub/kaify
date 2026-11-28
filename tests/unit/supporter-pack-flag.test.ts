import React, { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

// The component is compiled with the classic JSX runtime under vitest.
(globalThis as { React?: typeof React }).React = React;

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));
vi.mock("@/lib/lang-context", () => ({ useLang: () => ({ t: (k: string) => k }) }));

async function footerHtml(): Promise<string> {
  vi.resetModules();
  const { LandingFooter } = await import("@/components/landing/LandingFooter");
  return renderToStaticMarkup(createElement(LandingFooter));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supporter pack visibility", () => {
  it("is hidden unless NEXT_PUBLIC_SUPPORTER_PACK_ENABLED is exactly true", async () => {
    const { isSupporterPackEnabled } = await import("@/lib/billing/paddle-config");
    vi.stubEnv("NEXT_PUBLIC_SUPPORTER_PACK_ENABLED", "");
    expect(isSupporterPackEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SUPPORTER_PACK_ENABLED", "1");
    expect(isSupporterPackEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SUPPORTER_PACK_ENABLED", "true");
    expect(isSupporterPackEnabled()).toBe(true);
  });

  it("the footer has no support link while the pack is off, and shows it when on", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORTER_PACK_ENABLED", "false");
    expect(await footerHtml()).not.toContain("/pricing#supporter");
    vi.stubEnv("NEXT_PUBLIC_SUPPORTER_PACK_ENABLED", "true");
    expect(await footerHtml()).toContain("/pricing#supporter");
  });

  it("the pricing page renders the supporter card only behind the flag", () => {
    const src = readFileSync("components/landing/PricingPage.tsx", "utf8");
    expect(src).toMatch(/isSupporterPackEnabled\(\)\s*\?\s*\(\s*<ScrollReveal[\s\S]*?<SupporterPackCard \/>/);
  });
});
