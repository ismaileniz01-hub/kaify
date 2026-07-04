import { ApiError } from "@/lib/api/errors";
import { getDegradedState } from "@/lib/resilience/degraded-mode";

/**
 * Blocks AI routes while the system is in cost/health degraded mode.
 * Cron self-recovery clears the flag once providers recover.
 */
export async function assertAiAvailable(): Promise<void> {
  const state = await getDegradedState();
  if (!state.active) return;

  throw new ApiError(
    "SERVICE_UNAVAILABLE",
    "AI hizmeti geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.",
    { reason: state.reason, since: state.since },
  );
}
