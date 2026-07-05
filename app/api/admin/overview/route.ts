import { defineRoute } from "@/lib/api/route-handler";
import { getAdminOverview } from "@/lib/services/cost-admin.service";
import { getCircuitSnapshots } from "@/lib/resilience/circuit";
import { getDegradedState } from "@/lib/resilience/degraded-mode";
import { getErrorMonitorSnapshot } from "@/lib/resilience/error-monitor";
import { isCronSecretConfigured } from "@/lib/api/cron-auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/overview — operator hub: users, costs, health signals. */
export const GET = defineRoute(
  { route: "GET /api/admin/overview", auth: "admin" },
  async () => {
    const [overview, degraded, errorCounters] = await Promise.all([
      getAdminOverview(),
      getDegradedState(),
      getErrorMonitorSnapshot(),
    ]);

    return {
      overview,
      degraded,
      circuits: getCircuitSnapshots(),
      errorCounters,
      env: {
        upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL),
        deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        sentry: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
        cron: isCronSecretConfigured(),
      },
    };
  },
);
