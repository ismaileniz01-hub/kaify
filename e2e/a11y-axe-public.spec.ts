import { test, expect } from "@playwright/test";

const PAGES = ["/", "/pricing", "/privacy", "/terms", "/login", "/signup"] as const;

test.describe("public accessibility (no extra axe dependency)", () => {
  for (const path of PAGES) {
    test(`${path} has named controls, one H1, and labeled inputs`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("#main-content")).toBeVisible();

      const unnamed = await page.evaluate(() => {
        const interactive = Array.from(
          document.querySelectorAll("button, a[href], [role='button']"),
        );
        return interactive
          .filter((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const name = (
              el.getAttribute("aria-label") ||
              el.getAttribute("aria-labelledby") ||
              el.textContent ||
              (el.querySelector("img[alt]") as HTMLImageElement | null)?.alt ||
              ""
            ).trim();
            return name.length === 0;
          })
          .map((el) => el.outerHTML.slice(0, 120));
      });
      expect(unnamed, unnamed.join("\n")).toEqual([]);

      const unlabeled = await page.evaluate(() => {
        const inputs = Array.from(
          document.querySelectorAll("input:not([type='hidden']):not([type='submit'])"),
        );
        return inputs
          .filter((el) => {
            const id = el.getAttribute("id");
            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
            const wrapped = el.closest("label");
            const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
            return !label && !wrapped && !aria;
          })
          .map((el) => el.outerHTML.slice(0, 120));
      });
      expect(unlabeled, unlabeled.join("\n")).toEqual([]);
    });
  }
});
