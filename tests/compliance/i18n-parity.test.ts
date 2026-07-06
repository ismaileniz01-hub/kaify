import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LANG_DIR = join(process.cwd(), "lib", "lang");
const SOURCE = "en";

function readLocale(code: string): Record<string, string> {
  return JSON.parse(readFileSync(join(LANG_DIR, `${code}.json`), "utf8"));
}

describe("i18n locale parity", () => {
  const source = readLocale(SOURCE);
  const sourceKeys = Object.keys(source);

  const locales = readdirSync(LANG_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((c) => c !== SOURCE && c !== "zh");

  it.each(locales)("%s has every key from en.json", (code) => {
    const target = readLocale(code);
    const missing = sourceKeys.filter((k) => target[k] === undefined);
    expect(missing, `missing in ${code}: ${missing.slice(0, 5).join(", ")}`).toEqual([]);
  });
});
