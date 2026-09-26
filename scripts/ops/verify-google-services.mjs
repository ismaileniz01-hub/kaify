#!/usr/bin/env node
/**
 * Release gate: ensure android/app/google-services.json exists for FCM.
 * Usage: node scripts/ops/verify-google-services.mjs
 * Exit 0 when present; exit 1 with instructions when missing.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve("android/app/google-services.json");
const example = resolve("android/app/google-services.json.example");

if (!existsSync(target)) {
  console.error(
    "[verify-google-services] Missing android/app/google-services.json\n" +
      "Download from Firebase Console for package org.kaifyai.app and place it next to:\n" +
      `  ${example}`,
  );
  process.exit(1);
}

try {
  const raw = readFileSync(target, "utf8");
  JSON.parse(raw);
  if (!raw.includes("org.kaifyai.app") && !raw.includes("project_id")) {
    console.warn(
      "[verify-google-services] File present but does not look like a Firebase config — double-check package name org.kaifyai.app",
    );
  }
} catch {
  console.error("[verify-google-services] google-services.json is not valid JSON");
  process.exit(1);
}

console.log("[verify-google-services] OK — google-services.json present");
