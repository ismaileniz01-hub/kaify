import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TERMS_DOCUMENT_TR } from "@/lib/legal/documents/terms-tr";
import { COOKIES_DOCUMENT_TR } from "@/lib/legal/documents/cookies-tr";
import {
  REVIEWED_LANG_CODES,
  REVIEWED_LANG_OPTIONS,
  REVIEWED_LOCALE_MIN_TRANSLATED_RATIO,
  PRIORITY_QUALITY_LOCALES,
} from "@/lib/i18n/reviewed-locales";

const LANG_DIR = join(process.cwd(), "lib", "lang");

function readRaw(code: "en" | "tr"): string {
  return readFileSync(join(LANG_DIR, `${code}.json`), "utf8");
}

function readLocale(code: string): Record<string, string> {
  return JSON.parse(readFileSync(join(LANG_DIR, `${code}.json`), "utf8"));
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .toSorted();
}

function translationRatio(en: Record<string, string>, locale: Record<string, string>): number {
  const keys = Object.keys(en).filter((k) => !k.startsWith("admin."));
  let translated = 0;
  for (const key of keys) {
    const enVal = (en[key] ?? "").trim();
    const locVal = (locale[key] ?? "").trim();
    if (!enVal) continue;
    if (locVal && locVal !== enVal) {
      translated += 1;
      continue;
    }
    // Brand / short tokens may legitimately match English.
    if (
      ["Kaify Ai", "Kai", "Market", "Freezie", "Paddle", "Coaching"].includes(enVal) ||
      /^[A-Z0-9+._\-/]{1,12}$/.test(enVal)
    ) {
      translated += 1;
    }
  }
  return translated / keys.length;
}

describe("EN/TR localization quality", () => {
  const en = readLocale("en");
  const tr = readLocale("tr");

  it.each(["en", "tr"] as const)("%s has no duplicate JSON keys", (code) => {
    const keys = [...readRaw(code).matchAll(/^\s*"([^"]+)"\s*:/gm)].map(
      (match) => match[1],
    );
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    expect([...new Set(duplicates)]).toEqual([]);
  });

  it("preserves placeholders between English and Turkish", () => {
    const mismatches = Object.keys(en).filter(
      (key) =>
        JSON.stringify(placeholders(en[key])) !==
        JSON.stringify(placeholders(tr[key] ?? "")),
    );
    expect(mismatches).toEqual([]);
  });

  it("keeps check-in terminology distinct from authentication", () => {
    const checkInKeys = Object.keys(tr).filter(
      (key) => key.includes("check_in") || key.includes("checkin"),
    );
    const collisions = checkInKeys.filter((key) =>
      /\bgiriş(?: yap| yapıldı| yaptın| yapılamadı)?\b/i.test(tr[key]),
    );
    expect(collisions).toEqual([]);
  });

  it("uses the canonical Market label in Turkish navigation", () => {
    expect(tr["nav.market"]).toBe("Market");
    expect(tr["welcome.market"]).toBe("Market");
    expect(tr["market.title"]).toBe("Market");
  });

  it("keeps banned Turkish terminology pairs out of product copy", () => {
    const navShopKeys = ["nav.market", "welcome.market", "market.title"];
    for (const key of navShopKeys) {
      expect(tr[key]).not.toMatch(/\bpazar\b/i);
    }
    expect(tr["a11y.loading_page"]).toBe("Sayfa yükleniyor");
    expect(tr["error.global.retry"]).toBe("Yeniden dene");
    expect(en["admin.costs.title"]).toContain("Cost");
    expect(tr["admin.costs.title"]).toContain("Maliyet");
    expect(tr["common.retry"]).toBe("Tekrar dene");
    expect(tr["offline.retry"]).toMatch(/dene/i);
    expect(tr["signup.wizard.continue"]).toMatch(/^Devam/);
    expect(tr["landing.waitlist.join"]).toBe("Katıl");
    expect(tr["login.otp.a11y_group"]).toContain("giriş");
  });

  it("ships admin costs/audit/self-heal keys in both locales", () => {
    const prefixes = ["admin.costs.", "admin.audit.", "admin.self_heal."];
    const keys = Object.keys(en).filter((key) =>
      prefixes.some((prefix) => key.startsWith(prefix)),
    );
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      expect(tr[key]).toBeTruthy();
    }
  });

  it("has real Turkish copy for critical public surfaces", () => {
    const keys = Object.keys(en).filter(
      (key) =>
        key.startsWith("landing.hero.") ||
        key.startsWith("landing.about.") ||
        key.startsWith("landing.features.") ||
        key.startsWith("landing.streak.") ||
        key.startsWith("landing.leaderboard.") ||
        key.startsWith("pricing.hero.") ||
        key.startsWith("pricing.final."),
    );
    const allowedSame = new Set(["landing.leaderboard.country.turkey"]);
    const untranslated = keys.filter(
      (key) => !allowedSame.has(key) && tr[key] === en[key],
    );
    expect(untranslated).toEqual([]);
  });

  it("exposes only production-ready reviewed locales in the picker", () => {
    expect(REVIEWED_LANG_CODES).toEqual([
      "tr",
      "en",
      "de",
      "fr",
      "es",
      "es-mx",
      "es-ar",
      "it",
      "ar",
    ]);
    for (const incomplete of ["pt", "nl", "pl", "ru", "ko", "zh-CN", "ja"]) {
      expect(REVIEWED_LANG_CODES).not.toContain(incomplete);
    }
    const source = readFileSync(
      join(process.cwd(), "lib", "lang-context.tsx"),
      "utf8",
    );
    expect(source).toContain("REVIEWED_LANG_OPTIONS");
  });

  it("requires every reviewed non-English locale to pass corpus completeness", () => {
    for (const code of REVIEWED_LANG_CODES) {
      if (code === "en") continue;
      const dict = readLocale(code);
      const ratio = translationRatio(en, dict);
      expect(
        ratio,
        `${code} translated ratio ${ratio.toFixed(3)} below ${REVIEWED_LOCALE_MIN_TRANSLATED_RATIO}`,
      ).toBeGreaterThanOrEqual(REVIEWED_LOCALE_MIN_TRANSLATED_RATIO);
    }
  });

  it("keeps priority reviewed locales from being English clones on public surfaces", () => {
    const criticalPrefixes = [
      "landing.hero.",
      "landing.about.",
      "pricing.hero.",
      "pricing.final.",
      "a11y.",
      "error.global.",
      "nav.",
      "common.",
      "offline.",
    ];
    const allowExact = new Set([
      "nav.market",
      "nav.messages",
      "landing.leaderboard.country.turkey",
      "landing.hero.kai_alt",
      "common.relative.minutes",
      "common.relative.hours",
      "common.relative.days",
    ]);
    for (const code of PRIORITY_QUALITY_LOCALES) {
      expect(REVIEWED_LANG_CODES).toContain(code);
      const dict = readLocale(code);
      const keys = Object.keys(en).filter((key) =>
        criticalPrefixes.some((prefix) => key.startsWith(prefix)),
      );
      const identical = keys.filter((key) => {
        if (allowExact.has(key)) return false;
        const enVal = (en[key] ?? "").trim();
        if (dict[key] !== en[key]) return false;
        if (
          ["Kaify Ai", "Kai", "Market", "Freezie", "Paddle", "Coaching"].includes(
            enVal,
          )
        ) {
          return false;
        }
        if (/^[A-Z0-9+._\-/]{1,12}$/.test(enVal)) return false;
        return true;
      });
      expect(identical, `${code} still EN-identical on product surfaces`).toEqual(
        [],
      );
    }
  });

  it("ships complete Turkish legal documents", () => {
    expect(TERMS_DOCUMENT_TR.sections).toHaveLength(13);
    expect(COOKIES_DOCUMENT_TR.sections).toHaveLength(5);
    expect(
      TERMS_DOCUMENT_TR.sections.every((section) => section.blocks.length > 0),
    ).toBe(true);
    expect(
      COOKIES_DOCUMENT_TR.sections.every((section) => section.blocks.length > 0),
    ).toBe(true);
  });

  it("branches auth emails by request language", () => {
    for (const file of [
      "confirm-signup-otp.en.html",
      "magic-link-otp.en.html",
    ]) {
      const template = readFileSync(
        join(process.cwd(), "supabase", "email-templates", file),
        "utf8",
      );
      expect(template).toContain('{{ if eq .Data.language "tr" }}');
      expect(template).toContain("{{ .Token }}");
      expect(template).toContain("{{ else }}");
    }
    const runbook = readFileSync(
      join(process.cwd(), "supabase", "email-templates", "RUNBOOK.md"),
      "utf8",
    );
    expect(runbook).toContain("npm run auth:otp-template");
  });

  it("keeps REVIEWED_LANG_OPTIONS labels aligned with codes", () => {
    expect(REVIEWED_LANG_OPTIONS.map((o) => o.code)).toEqual(REVIEWED_LANG_CODES);
    const files = readdirSync(LANG_DIR).filter((f) => f.endsWith(".json"));
    for (const code of REVIEWED_LANG_CODES) {
      expect(files).toContain(`${code}.json`);
    }
  });
});
