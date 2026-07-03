import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      // Gate the pure, unit-testable core. DB-bound services and AI clients
      // require integration infra and are intentionally out of this gate.
      include: [
        "lib/api/response.ts",
        "lib/api/errors.ts",
        "lib/api/rate-guard.ts",
        "lib/ai/quota-guard.ts",
        "lib/ai/prompt-safety.ts",
        "lib/resilience/error-taxonomy.ts",
        "lib/resilience/retry.ts",
        "lib/resilience/circuit.ts",
        "lib/resilience/index.ts",
        "lib/api/cron-auth.ts",
        "lib/supabase/profile-compat.ts",
        "lib/ai/cost.ts",
        "lib/logger.ts",
        "lib/api-security.ts",
        "lib/security/body-limit.ts",
        "lib/security/csp.ts",
        "lib/push/messages.ts",
        "lib/i18n/dictionary.ts",
        "lib/notifications/config.ts",
        "lib/marketing/sender.ts",
        "lib/validations/profile.schema.ts",
        "lib/validations/pagination.schema.ts",
      ],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 80,
        lines: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
