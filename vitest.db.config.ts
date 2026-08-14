import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Database-backed Vitest suite (RLS / RPC / migration reproducibility).
 * Sets KAIFY_DB_TESTS=1 so suites do not skip.
 * Requires a local Supabase stack (`supabase start` + `db reset`).
 */
process.env.KAIFY_DB_TESTS = "1";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    globals: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    reporters: process.env.CI ? ["default", "json"] : ["default"],
    outputFile: {
      json: "audit/remediation/_vitest-db-last.json",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
