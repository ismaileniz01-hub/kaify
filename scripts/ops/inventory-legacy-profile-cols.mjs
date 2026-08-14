/**
 * Inventory legacy profile column references that break clean-DB migration.
 * Run: node scripts/ops/inventory-legacy-profile-cols.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "supabase", "migrations");
const LEGACY = ["full_name", "subscription_tier", "height", "weight", "experience"];

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

/** @type {Record<string, Array<{file:string,line:number,text:string,kind:string}>>} */
const out = Object.fromEntries(LEGACY.map((c) => [c, []]));

for (const file of files) {
  const lines = readFileSync(join(DIR, file), "utf8").split(/\n/);
  lines.forEach((text, idx) => {
    for (const col of LEGACY) {
      if (!new RegExp(`\\b${col}\\b`).test(text)) continue;
      let kind = "other";
      if (col === "subscription_tier" && /as enum|public\.subscription_tier/.test(text)) {
        kind = "type_ref_ok";
      } else if (/raw_user_meta_data\s*->>\s*'full_name'/.test(text) && col === "full_name") {
        kind = "json_meta_ok";
      } else if (/information_schema\.columns/.test(text) || /column_name\s*=\s*'/.test(text)) {
        kind = "guarded";
      } else if (/\b(p\.)?full_name\b|\btrim\(full_name\)/.test(text) && col === "full_name") {
        kind = "profiles_column_ref";
      } else if (
        col === "subscription_tier" &&
        /(set|coalesce|alter column|=\s*null).*subscription_tier|subscription_tier\s*=/.test(text)
      ) {
        kind = "profiles_column_ref";
      } else if (
        (col === "height" || col === "weight" || col === "experience") &&
        new RegExp(`\\b${col}\\b`).test(text) &&
        !new RegExp(`${col}_(cm|kg|level)`).test(text.replace(new RegExp(`\\b${col}\\b`), "X"))
      ) {
        // height_cm contains height as substring — skip if only height_cm/weight_kg/experience_level
        if (
          (col === "height" && /\bheight_cm\b/.test(text) && !/\bheight\b/.test(text.replace(/height_cm/g, "H"))) ||
          (col === "weight" && /\bweight_kg\b/.test(text) && !/\bweight\b/.test(text.replace(/weight_kg/g, "W"))) ||
          (col === "experience" &&
            /\bexperience_level\b/.test(text) &&
            !/\bexperience\b/.test(text.replace(/experience_level/g, "E")))
        ) {
          continue;
        }
        if (new RegExp(`\\b${col}\\b`).test(text.replace(/height_cm/g, "").replace(/weight_kg/g, "").replace(/experience_level/g, ""))) {
          kind = "profiles_column_ref";
        } else {
          continue;
        }
      }
      out[col].push({ file, line: idx + 1, text: text.trim().slice(0, 140), kind });
    }
  });
}

for (const col of LEGACY) {
  const risky = out[col].filter((h) => h.kind === "profiles_column_ref" || h.kind === "other");
  console.log(`\n## ${col} risky=${risky.length} total=${out[col].length}`);
  for (const h of risky) {
    console.log(`  ${h.file}:${h.line} [${h.kind}] ${h.text}`);
  }
}
