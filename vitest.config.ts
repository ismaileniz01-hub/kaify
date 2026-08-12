import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Coverage philosophy (TEST-001 / Wave 2):
 * Report coverage over the critical application surface (lib + API routes),
 * not a cherry-picked 5% subset. Thresholds are an honest regression floor —
 * ratchet upward over time; do not exclude critical untested files to inflate %.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Live RLS/RPC suites skip unless KAIFY_DB_TESTS=1 (see vitest.db.config.ts).
    // Static migration-reproducibility checks in tests/db always run.
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/db/rls-authorization.test.ts",
      "tests/db/rpc-authorization.test.ts",
    ],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "lib/types/**",
        "lib/**/*.d.ts",
        "lib/lang/**",
        // Heavy Next/server entry glue with little unit-testable logic:
        "lib/supabase/client.ts",
        "lib/supabase/server.ts",
        "lib/supabase/middleware.ts",
        "lib/supabase/admin.ts",
        "lib/supabase/route-handler.ts",
        // Capacitor / native bridges — not exercised in node vitest:
        "lib/native/**",
        "lib/capacitor/**",
      ],
      // Honest regression floor measured 2026-08-12 after expanding scope
      // (statements ~25%, branches ~23%, functions ~29%, lines ~26%).
      // Buffer below measured values prevents flaky CI; ratchet upward later.
      thresholds: {
        statements: 22,
        branches: 18,
        functions: 24,
        lines: 22,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
