import { classifyError } from "@/lib/resilience/error-taxonomy";

/**
 * Generic in-process circuit breaker with three states:
 *
 *   closed    → calls pass through; failures are counted
 *   open      → calls fail fast (CircuitOpenError) until the cooldown elapses
 *   half-open → one probe is allowed; success closes it, failure re-opens it
 *
 * Only *availability* failures (transient / upstream / rate_limit) count toward
 * tripping — a validation/bad-output error must not open a provider's breaker.
 *
 * State is per-process. On serverless that means per-instance, which is fine as
 * a fast local guard; cross-instance awareness is provided at the health layer.
 */

type CircuitInternal = {
  failures: number;
  openUntil: number; // epoch ms; 0 = never opened
  halfOpen: boolean;
};

const circuits = new Map<string, CircuitInternal>();
const registered = new Set<string>();

const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 30_000;

export type CircuitOptions = {
  threshold?: number;
  cooldownMs?: number;
  /** Which errors count as a circuit failure. Default: availability errors. */
  isFailure?: (error: unknown) => boolean;
};

export type CircuitSnapshot = {
  name: string;
  open: boolean;
  halfOpen: boolean;
  failures: number;
};

export class CircuitOpenError extends Error {
  readonly circuit: string;

  constructor(circuit: string) {
    super(`Circuit '${circuit}' is open`);
    this.name = "CircuitOpenError";
    this.circuit = circuit;
  }
}

const defaultIsFailure = (error: unknown): boolean =>
  classifyError(error).countsTowardCircuit;

function getState(name: string): CircuitInternal {
  return circuits.get(name) ?? { failures: 0, openUntil: 0, halfOpen: false };
}

/** Wrap a call with the breaker for `name`. */
export async function withCircuit<T>(
  name: string,
  fn: () => Promise<T>,
  options: CircuitOptions = {},
): Promise<T> {
  registered.add(name);
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const isFailure = options.isFailure ?? defaultIsFailure;

  const now = Date.now();
  const state = getState(name);

  // Still cooling down → fail fast.
  if (state.openUntil > now) {
    throw new CircuitOpenError(name);
  }

  // Cooldown elapsed after an open → allow a single half-open probe.
  const probing = state.openUntil !== 0 && state.openUntil <= now;
  if (probing) {
    circuits.set(name, { ...state, halfOpen: true });
  }

  try {
    const result = await fn();
    circuits.set(name, { failures: 0, openUntil: 0, halfOpen: false });
    return result;
  } catch (error) {
    // Non-availability errors pass through without affecting the breaker.
    if (!isFailure(error)) throw error;

    const current = getState(name);
    const failures = current.failures + 1;
    const shouldOpen = current.halfOpen || failures >= threshold;
    circuits.set(name, {
      failures,
      openUntil: shouldOpen ? Date.now() + cooldownMs : 0,
      halfOpen: false,
    });
    throw error;
  }
}

/** Read-only snapshot of every circuit that has been exercised this process. */
export function getCircuitSnapshots(): CircuitSnapshot[] {
  const now = Date.now();
  return [...registered].map((name) => {
    const s = circuits.get(name);
    return {
      name,
      open: s ? s.openUntil > now : false,
      halfOpen: s?.halfOpen ?? false,
      failures: s?.failures ?? 0,
    };
  });
}

/** Manual reset (used by self-recovery jobs / tests). */
export function resetCircuit(name: string): void {
  circuits.set(name, { failures: 0, openUntil: 0, halfOpen: false });
}

/** Clears ALL breaker state. Test-only helper. */
export function __resetAllCircuits(): void {
  circuits.clear();
  registered.clear();
}
