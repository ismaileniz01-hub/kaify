/**
 * Legacy path reachability — asserts KAIOS early returns and classifies
 * COACH_CHAT_VOICE usage via source reads (not shell grep).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { maybeGenerateStructuredCard } from "@/lib/ai/structured-chat";
import { AI_FEATURES } from "@/lib/ai/budget";

const ROOT = process.cwd();

function readSrc(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".next") continue;
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

describe("legacy KAIOS path early returns", () => {
  it("chat.service streamCoachReply returns early on kaiosRuntime and logs rollback only on legacy", () => {
    const src = readSrc("lib/services/chat.service.ts");

    expect(src).toMatch(/export async function\*?\s*streamCoachReply/);
    expect(src).toMatch(/if\s*\(\s*AI_FEATURES\.kaiosRuntime\s*\)/);
    expect(src).toMatch(/yield\*\s*streamKaiosCoachReply/);
    expect(src).toMatch(/return;/);

    // Rollback log is after the early return (legacy-only branch).
    const kaiosIdx = src.indexOf("if (AI_FEATURES.kaiosRuntime)");
    const rollbackIdx = src.indexOf('kaios.runtime.rollback_active');
    const legacyChatIdx = src.indexOf('path: "legacy_chat"');
    expect(kaiosIdx).toBeGreaterThanOrEqual(0);
    expect(rollbackIdx).toBeGreaterThan(kaiosIdx);
    expect(legacyChatIdx).toBeGreaterThan(rollbackIdx);

    // Documents no fallback into COACH_CHAT_VOICE on the KAIOS path.
    expect(src).toMatch(/COACH_CHAT_VOICE/);
    expect(src).toMatch(/NO fallback into legacy personality/);
  });

  it("team-chat.service generateWeeklyTeamMeeting early-returns to council under KAIOS", () => {
    const src = readSrc("lib/services/team-chat.service.ts");

    expect(src).toMatch(/export async function generateWeeklyTeamMeeting/);
    expect(src).toMatch(/if\s*\(\s*AI_FEATURES\.kaiosRuntime\s*\)/);
    expect(src).toMatch(/runCouncilTurn/);
    expect(src).toMatch(/return result\.messages/);

    const kaiosIdx = src.indexOf("if (AI_FEATURES.kaiosRuntime)");
    const rollbackIdx = src.indexOf('kaios.runtime.rollback_active');
    const legacyPathIdx = src.indexOf('path: "legacy_team_meeting"');
    expect(kaiosIdx).toBeGreaterThanOrEqual(0);
    expect(rollbackIdx).toBeGreaterThan(kaiosIdx);
    expect(legacyPathIdx).toBeGreaterThan(rollbackIdx);
  });

  it("structured-chat maybeGenerateStructuredCard hard-stops on kaiosRuntime", async () => {
    const src = readSrc("lib/ai/structured-chat.ts");
    expect(src).toMatch(/if\s*\(\s*AI_FEATURES\.kaiosRuntime\s*\)\s*return null/);
    expect(src).toMatch(/Hard stop:\s*KAIOS path never uses a second card LLM/);

    expect(AI_FEATURES.kaiosRuntime).toBe(true);
    await expect(
      maybeGenerateStructuredCard({
        coachId: "maya",
        userMessage: "make me a meal plan please",
        coachReply: "Sure",
        locale: "en",
      }),
    ).resolves.toBeNull();
  });
});

describe("COACH_CHAT_VOICE usage classification (file reads)", () => {
  it("classifies definition vs legacy consumers vs kaios non-use", () => {
    const libRoot = join(ROOT, "lib");
    const files = walkTsFiles(libRoot);
    expect(files.length).toBeGreaterThan(0);

    type Classification =
      | "definition"
      | "legacy_prompt_builder"
      | "rollback_comment_only"
      | "import_personas_other"
      | "unrelated";

    const classifications: Array<{
      rel: string;
      class: Classification;
      notes: string[];
    }> = [];

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("COACH_CHAT_VOICE") && !/from\s+["']@\/lib\/ai\/personas["']/.test(src)) {
        continue;
      }

      const rel = file.slice(ROOT.length + 1);
      const notes: string[] = [];
      let cls: Classification = "unrelated";

      if (rel === "lib/ai/personas.ts" && /const COACH_CHAT_VOICE/.test(src)) {
        cls = "definition";
        notes.push("defines COACH_CHAT_VOICE");
        if (/COACH_CHAT_VOICE\[params\.coachId\]/.test(src)) {
          notes.push("consumed by buildChatSystemPrompt");
        }
      } else if (src.includes("COACH_CHAT_VOICE")) {
        if (/rollback|LEGACY|NO fallback/.test(src)) {
          cls = "rollback_comment_only";
          notes.push("mentions COACH_CHAT_VOICE in rollback/legacy commentary");
        } else {
          cls = "legacy_prompt_builder";
          notes.push("references COACH_CHAT_VOICE outside personas definition");
        }
      } else if (/from\s+["']@\/lib\/ai\/personas["']/.test(src)) {
        cls = "import_personas_other";
        const imports = src.match(
          /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/ai\/personas["']/,
        );
        notes.push(
          imports
            ? `imports: ${imports[1].replace(/\s+/g, " ").trim()}`
            : "imports personas module",
        );
        // Must not pull COACH_CHAT_VOICE (it is not exported).
        expect(src).not.toMatch(/COACH_CHAT_VOICE/);
      }

      if (cls !== "unrelated" || src.includes("COACH_CHAT_VOICE")) {
        classifications.push({ rel, class: cls, notes });
      }
    }

    const byClass = Object.fromEntries(
      (["definition", "legacy_prompt_builder", "rollback_comment_only", "import_personas_other"] as const).map(
        (c) => [c, classifications.filter((x) => x.class === c).map((x) => x.rel)],
      ),
    ) as Record<string, string[]>;

    expect(byClass.definition).toEqual(["lib/ai/personas.ts"]);
    // COACH_CHAT_VOICE itself is module-private; only comment references elsewhere.
    expect(byClass.legacy_prompt_builder).toEqual([]);
    expect(byClass.rollback_comment_only).toContain("lib/services/chat.service.ts");

    // KAIOS runtime tree must not reference COACH_CHAT_VOICE.
    const kaiosFiles = files.filter((f) => f.includes(`${join("lib", "kaios")}`));
    for (const file of kaiosFiles) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/COACH_CHAT_VOICE/);
    }

    // Personas consumers under lib/ are legacy/rollback helpers, not kaios/*.
    for (const rel of byClass.import_personas_other) {
      expect(rel.startsWith("lib/kaios/")).toBe(false);
    }
  });
});
