import { classifyError } from "@/lib/resilience/error-taxonomy";
import { cacheDelete, cacheGet, cacheSet, cacheSetNx, isCacheConfigured } from "@/lib/cache";
import { logger } from "@/lib/logger";

/**
 * Circuit breaker with optional shared Redis state.
 *
 * Local Map is always the fast path. When Redis is configured, open/failure
 * state is merged across serverless instances so one unhealthy provider does
 * not require every cold isolate to independently fail N times.
 *
 * Redis outage degrades to in-process only — the breaker is never a SPOF.
 * Half-open probes use SET NX so only one isolate probes at a time.
 */

type CircuitInternal = {
  failures: number;
  openUntil: number; // epoch ms; 0 = never opened
  halfOpen: boolean;
};

export type CircuitSharedStore = {
  get(key: string): Promise<CircuitInternal | null>;
  set(key: string, value: CircuitInternal, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  setNx(key: string, ttlSeconds: number): Promise<boolean>;
};

const circuits = new Map<string, CircuitInternal>();
const registered = new Set<string>();

const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 30_000;
const SHARED_TTL_PAD_SECONDS = 60;
const PROBE_TTL_SECONDS = 10;

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

function emptyState(): CircuitInternal {
  return { failures: 0, openUntil: 0, halfOpen: false };
}

function getLocal(name: string): CircuitInternal {
  return circuits.get(name) ?? emptyState();
}

function sharedKey(name: string): string {
  return `circuit:v1:${name}`;
}

function probeKey(name: string): string {
  return `circuit:v1:${name}:probe`;
}

function mergeState(a: CircuitInternal, b: CircuitInternal): CircuitInternal {
  return {
    failures: Math.max(a.failures, b.failures),
    openUntil: Math.max(a.openUntil, b.openUntil),
    halfOpen: a.halfOpen || b.halfOpen,
  };
}

const redisStore: CircuitSharedStore = {
  async get(key) {
    return cacheGet<CircuitInternal>(key);
  },
  async set(key, value, ttlSeconds) {
    await cacheSet(key, value, ttlSeconds);
  },
  async del(key) {
    await cacheDelete(key);
  },
  async setNx(key, ttlSeconds) {
    return cacheSetNx(key, "1", ttlSeconds);
  },
};

let injectedStore: CircuitSharedStore | null = null;
/** When true, skip Redis even if configured (tests / Redis-down simulation). */
let sharedDisabled = false;

export function __setCircuitSharedStore(store: CircuitSharedStore | null): void {
  injectedStore = store;
}

export function __setCircuitSharedDisabled(disabled: boolean): void {
  sharedDisabled = disabled;
}

function store(): CircuitSharedStore | null {
  if (sharedDisabled) return null;
  if (injectedStore) return injectedStore;
  if (!isCacheConfigured()) return null;
  return redisStore;
}

async function loadShared(name: string): Promise<CircuitInternal | null> {
  const s = store();
  if (!s) return null;
  try {
    return await s.get(sharedKey(name));
  } catch {
    return null;
  }
}

async function persistShared(name: string, state: CircuitInternal, cooldownMs: number): Promise<void> {
  const s = store();
  if (!s) return;
  const ttl = Math.max(
    5,
    Math.ceil((Math.max(0, state.openUntil - Date.now()) + cooldownMs) / 1000) +
      SHARED_TTL_PAD_SECONDS,
  );
  try {
    if (state.failures === 0 && state.openUntil === 0) {
      await s.del(sharedKey(name));
      await s.del(probeKey(name));
      return;
    }
    await s.set(sharedKey(name), { ...state, halfOpen: false }, ttl);
  } catch (error) {
    logger.warn("circuit.shared persist failed", {
      circuit: name,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function tryAcquireProbe(name: string): Promise<boolean> {
  const s = store();
  if (!s) return true;
  try {
    return await s.setNx(probeKey(name), PROBE_TTL_SECONDS);
  } catch {
    return true;
  }
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

  const remote = await loadShared(name);
  const local = getLocal(name);
  const state = remote ? mergeState(local, remote) : local;
  circuits.set(name, state);

  const now = Date.now();

  if (state.openUntil > now) {
    throw new CircuitOpenError(name);
  }

  const probing = state.openUntil !== 0 && state.openUntil <= now;
  if (probing) {
    const acquired = await tryAcquireProbe(name);
    if (!acquired) {
      throw new CircuitOpenError(name);
    }
    circuits.set(name, { ...state, halfOpen: true });
    logger.info("circuit.half_open", { circuit: name });
  }

  try {
    const result = await fn();
    const closed = emptyState();
    circuits.set(name, closed);
    await persistShared(name, closed, cooldownMs);
    return result;
  } catch (error) {
    if (!isFailure(error)) throw error;

    const current = getLocal(name);
    const failures = current.failures + 1;
    const shouldOpen = current.halfOpen || failures >= threshold;
    const next: CircuitInternal = {
      failures,
      openUntil: shouldOpen ? Date.now() + cooldownMs : 0,
      halfOpen: false,
    };
    circuits.set(name, next);
    await persistShared(name, next, cooldownMs);
    if (shouldOpen) {
      logger.warn("circuit.open", {
        circuit: name,
        failures,
        cooldownMs,
      });
    }
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
  circuits.set(name, emptyState());
  const s = store();
  if (s) {
    void s.del(sharedKey(name));
    void s.del(probeKey(name));
  }
}

/** Clears ALL breaker state. Test-only helper. */
export function __resetAllCircuits(): void {
  circuits.clear();
  registered.clear();
  sharedDisabled = false;
}
