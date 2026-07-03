import { describe, expect, it } from "vitest";
import { renderPushCopy } from "@/lib/push/messages";
import { resolveLocale } from "@/lib/i18n/dictionary";

describe("resolveLocale", () => {
  it("matches exact locale codes", () => {
    expect(resolveLocale("es-mx")).toBe("es-mx");
    expect(resolveLocale("zh-CN")).toBe("zh-CN");
    expect(resolveLocale("EN")).toBe("en");
  });

  it("falls back to the base language", () => {
    expect(resolveLocale("es-419")).toBe("es");
    expect(resolveLocale("pt-BR")).toBe("pt");
    expect(resolveLocale("de-AT")).toBe("de");
  });

  it("falls back to english for unknown/empty", () => {
    expect(resolveLocale("xx")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });
});

describe("renderPushCopy", () => {
  it("renders a known key in english with interpolation", async () => {
    const copy = await renderPushCopy({
      titleKey: "notif.streak_milestone",
      params: { days: 30 },
      locale: "en",
    });
    expect(copy?.title).toBe("30-day streak!");
    expect(copy?.body).toContain("30 days in a row");
  });

  it("renders a known key in the user's language (tr, not english)", async () => {
    const copy = await renderPushCopy({
      titleKey: "notif.streak_risk",
      params: { streak: 12 },
      locale: "tr",
    });
    expect(copy).not.toBeNull();
    expect(copy?.title).not.toBe("Your streak is at risk!");
    expect(copy?.body).toContain("12");
  });

  it("resolves regional locales to the base dictionary", async () => {
    const copy = await renderPushCopy({
      titleKey: "notif.streak_milestone",
      params: { days: 5 },
      locale: "en-GB",
    });
    expect(copy?.title).toBe("5-day streak!");
  });

  it("falls back to free-text title/body for unknown key", async () => {
    const copy = await renderPushCopy({
      titleKey: "notif.does_not_exist",
      title: "Custom title",
      body: "Custom body",
      locale: "en",
    });
    expect(copy).toEqual({ title: "Custom title", body: "Custom body" });
  });

  it("returns null when no title can be produced", async () => {
    const copy = await renderPushCopy({ locale: "tr" });
    expect(copy).toBeNull();
  });

  it("leaves placeholders intact when params are missing", async () => {
    const copy = await renderPushCopy({
      titleKey: "notif.kai_level_up",
      locale: "en",
    });
    expect(copy?.body).toContain("{level}");
  });
});
