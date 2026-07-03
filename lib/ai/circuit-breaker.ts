import {
  withCircuit,
  getCircuitSnapshots as getGenericSnapshots,
} from "@/lib/resilience/circuit";

/**
 * Thin AI-provider adapter over the generic resilience circuit breaker
 * (`lib/resilience/circuit.ts`). Kept for backward compatibility and to expose
 * a provider-shaped snapshot to the health check.
 */

/** AI providers surfaced in the health check. */
export const CIRCUIT_PROVIDERS = ["deepseek", "gemini"] as const;

export type CircuitSnapshot = {
  provider: string;
  open: boolean;
  failures: number;
};

/** Provider-shaped snapshot for /api/health. */
export function getCircuitSnapshots(): CircuitSnapshot[] {
  const all = getGenericSnapshots();
  return CIRCUIT_PROVIDERS.map((provider) => {
    const s = all.find((x) => x.name === provider);
    return {
      provider,
      open: s?.open ?? false,
      failures: s?.failures ?? 0,
    };
  });
}

/**
 * @deprecated Prefer `resilient(name, fn)` from `@/lib/resilience`, which adds
 * retry + fallback around the breaker. Retained so existing callers keep working.
 */
export function withCircuitBreaker<T>(
  provider: string,
  fn: () => Promise<T>,
  options?: { threshold?: number; cooldownMs?: number },
): Promise<T> {
  return withCircuit(provider, fn, options);
}
