import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `missing rule: ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("keyboard CSS contract", () => {
  it("sizes the chat shell to the visible area, min-height included", () => {
    const chat = rule("html[data-keyboard-open] .phone-shell.chat-shell");
    expect(chat).toContain("height: var(--app-visible-height, 100dvh)");
    // `.phone-shell { min-height: 100dvh }` silently beats height otherwise.
    expect(chat).toContain("min-height: var(--app-visible-height, 100dvh)");
  });

  it("never offsets the composer on top of the shrunken shell", () => {
    expect(rule("html.native-app .chat-composer")).not.toContain("--keyboard-offset");
  });

  it("hides the bottom dock while the keyboard is open", () => {
    expect(rule("html[data-keyboard-open] .bottom-nav")).toContain("visibility: hidden");
  });

  it("ends overlays at the keyboard top and lets their panel scroll", () => {
    expect(css).toContain("html[data-keyboard-open] .motion-overlay,");
    expect(css).toContain("html[data-keyboard-open] .keyboard-overlay {");
    expect(css).toContain("html[data-keyboard-open] .keyboard-overlay > [role=\"dialog\"]");
  });
});
