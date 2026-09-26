import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRuntimeContext, compilePrompt } from "@/lib/kaios";

const FULL_SPEC_HEADERS = [
  "Kaify AI Operating System —",
  "KAIOS FULL SPEC",
  "=== KAIOS MASTER SPEC ===",
  "Kaify AI Operating System — Complete",
];

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("no full-spec at runtime", () => {
  it("compilePrompt output never embeds full-spec headers", () => {
    const ctx = buildRuntimeContext({
      coach: "alex",
      message: "Build me a push-pull program",
      locale: "en",
      userState: "focus: strength",
      memoryItems: ["trains 4x/week"],
      teamFacts: ["Maya owns nutrition macros"],
      knowledge: ["progressive overload basics"],
      conversationTurns: [{ role: "user", content: "I have a barbell" }],
    });
    const { messages } = compilePrompt(ctx);
    const blob = messages.map((m) => m.content).join("\n\n");
    for (const header of FULL_SPEC_HEADERS) {
      expect(blob).not.toContain(header);
    }
  });

  it("lib/kaios has no imports of kaios/source", () => {
    const root = join(process.cwd(), "lib/kaios");
    const files = walkTsFiles(root);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (
        /from\s+["'][^"']*kaios\/source/.test(src) ||
        /import\s*\(\s*["'][^"']*kaios\/source/.test(src) ||
        /require\(\s*["'][^"']*kaios\/source/.test(src)
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
