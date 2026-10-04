"use client";

import { apiPost } from "@/lib/api/client";
import { notifyAnalyticsUpdated } from "@/lib/analytics-client-cache";
import {
  aggregateStepSamples,
  localDateKeyFromIso,
  pickStepSamples,
  stepReadWindow,
} from "@/lib/health/aggregate-samples";
import { getNativePlatform, isNativePlatform } from "@/lib/native/platform";

const CONNECTED_KEY = "kaify:health-steps-connected";
export const HEALTH_STEPS_SYNCED_EVENT = "kaify:health-steps-synced";

export type HealthStepsStatus =
  | "web"
  | "unavailable"
  | "denied"
  | "connected"
  | "disconnected";

function readConnectedFlag(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(CONNECTED_KEY) === "1";
}

function writeConnectedFlag(connected: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (connected) localStorage.setItem(CONNECTED_KEY, "1");
  else localStorage.removeItem(CONNECTED_KEY);
}

export function isHealthStepsConnected(): boolean {
  return readConnectedFlag();
}

export async function disconnectHealthSteps(): Promise<HealthStepsStatus> {
  writeConnectedFlag(false);
  try {
    const Health = await settleWithin(loadHealthPluginCached(), 4_000);
    if (Health) {
      await settleWithin(Health.requestAuthorization({ read: [], write: [] }), HEALTH_CALL_MS);
    }
  } catch {
    // Plugin absence must not leave the app in a connected state.
  }
  return "disconnected";
}

async function loadHealthPlugin() {
  const { Health } = await import("@capgo/capacitor-health");
  return Health;
}

type HealthPlugin = Awaited<ReturnType<typeof loadHealthPlugin>>;

let healthPluginPromise: Promise<HealthPlugin> | null = null;
let healthPluginSync: HealthPlugin | null = null;
let pendingAuthorization: Promise<unknown> | null = null;

function loadHealthPluginCached() {
  healthPluginPromise ??= loadHealthPlugin().then((plugin) => {
    healthPluginSync = plugin;
    return plugin;
  });
  return healthPluginPromise;
}

const STEP_READ = {
  read: ["steps"] as ["steps"],
  write: [] as [],
  requestHistoryAccess: true,
};

/** Call inside the click, before any await, so iOS still presents the Health sheet. */
export function requestStepAccessNow(): void {
  const Health = healthPluginSync;
  if (!Health || pendingAuthorization) return;
  pendingAuthorization = Health.requestAuthorization(STEP_READ);
}

/** Warm the native bridge so Connect does not spend the tap on a dynamic import. */
export function preloadHealthPlugin(): void {
  void loadHealthPluginCached().catch(() => {
    healthPluginPromise = null;
  });
}

/**
 * `true` granted, `false` denied, `null` not determined.
 * iOS HealthKit often leaves both lists empty even after a grant.
 * Android Health Connect does the same until the user answers.
 */
export function interpretStepAuthorization(
  auth: { readAuthorized?: readonly string[] | null; readDenied?: readonly string[] | null },
): boolean | null {
  if (auth.readDenied?.includes("steps") === true) return false;
  if (auth.readAuthorized?.includes("steps") === true) return true;
  return null;
}

const HEALTH_CALL_MS = 12_000;

/** Plugin sheets and reads must settle. A hung native call was leaving Connect disabled. */
function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

async function stepsAuthorizationGranted(): Promise<boolean | null> {
  try {
    const Health = await settleWithin(loadHealthPluginCached(), 4_000);
    if (!Health) return null;
    const auth = await settleWithin(
      Health.checkAuthorization({ read: ["steps"] }),
      HEALTH_CALL_MS,
    );
    if (!auth) return null;
    return interpretStepAuthorization(auth);
  } catch {
    return null;
  }
}

const ASKED_KEY = "kaify:health-steps-asked";

async function ensureStepAccess(): Promise<boolean> {
  const Health = await settleWithin(loadHealthPluginCached(), 4_000);
  if (!Health) return false;
  const availability = await settleWithin(Health.isAvailable(), 3_000);
  if (!availability?.available) {
    writeConnectedFlag(false);
    return false;
  }

  const status = await stepsAuthorizationGranted();
  if (status === false) {
    writeConnectedFlag(false);
    return false;
  }
  if (status === true) {
    writeConnectedFlag(true);
    return true;
  }

  // Not determined. Ask once, then read on both platforms. An empty status is
  // not a denial: iOS hides the grant, and Android does the same until answered.
  const asked = typeof localStorage !== "undefined" && localStorage.getItem(ASKED_KEY) === "1";
  if (!asked) {
    if (typeof localStorage !== "undefined") localStorage.setItem(ASKED_KEY, "1");
    await settleWithin(
      Health.requestAuthorization({
        read: ["steps"],
        write: [],
        requestHistoryAccess: true,
      }),
      HEALTH_CALL_MS,
    );
    const after = await stepsAuthorizationGranted();
    if (after === false) {
      writeConnectedFlag(false);
      return false;
    }
  }

  writeConnectedFlag(true);
  return true;
}

export async function getHealthStepsStatus(): Promise<HealthStepsStatus> {
  if (!(await settleWithin(isNativePlatform(), 2_000))) return "web";
  try {
    const Health = await settleWithin(loadHealthPluginCached(), 4_000);
    if (!Health) return "unavailable";
    const availability = await settleWithin(Health.isAvailable(), 3_000);
    if (!availability) return readConnectedFlag() ? "connected" : "disconnected";
    if (!availability.available) {
      writeConnectedFlag(false);
      return "unavailable";
    }
    const granted = await stepsAuthorizationGranted();
    if (granted === false) {
      writeConnectedFlag(false);
      return "denied";
    }
    if (granted === true || readConnectedFlag()) return "connected";
    return "disconnected";
  } catch {
    return "unavailable";
  }
}

export async function connectHealthSteps(): Promise<HealthStepsStatus> {
  if (!(await settleWithin(isNativePlatform(), 2_000))) return "web";
  const Health = await settleWithin(loadHealthPluginCached(), 4_000);
  if (!Health) return "unavailable";

  if (typeof localStorage !== "undefined") localStorage.setItem(ASKED_KEY, "1");
  // Ask on the tap. Waiting for isAvailable first drops the user gesture and
  // the Health sheet never opens, which left Connect looking stuck.
  if (!pendingAuthorization) {
    pendingAuthorization = Health.requestAuthorization(STEP_READ);
  }
  const authorization = settleWithin(pendingAuthorization, 15_000).finally(() => {
    pendingAuthorization = null;
  });
  const availability = settleWithin(Health.isAvailable(), 3_000);
  const [authSettled, available] = await Promise.all([authorization, availability]);
  if (available && available.available === false) {
    writeConnectedFlag(false);
    return "unavailable";
  }
  if (authSettled === undefined && !available) {
    writeConnectedFlag(false);
    return "disconnected";
  }

  const granted = await stepsAuthorizationGranted();
  if (granted === false) {
    writeConnectedFlag(false);
    return "denied";
  }
  if (granted === null && authSettled === undefined) {
    writeConnectedFlag(false);
    return "disconnected";
  }

  writeConnectedFlag(true);
  void syncNativeHealthSteps().catch(() => undefined);
  return "connected";
}

let syncInFlight: Promise<number> | null = null;

export function syncNativeHealthSteps(): Promise<number> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = syncNativeHealthStepsOnce().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function syncNativeHealthStepsOnce(): Promise<number> {
  if (!(await settleWithin(isNativePlatform(), 2_000))) return 0;
  if (!(await ensureStepAccess())) return 0;

  const Health = await settleWithin(loadHealthPluginCached(), 4_000);
  if (!Health) return 0;
  const platform = await getNativePlatform();
  const source = platform === "ios" ? "healthkit" : "google_fit";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const range = stepReadWindow(new Date(), timeZone);

  let aggregated: Array<{ startDate?: string; value?: number; values?: { sum?: number } }> = [];
  try {
    const result = await settleWithin(
      Health.queryAggregated({
        dataType: "steps",
        startDate: range.startIso,
        endDate: range.endIso,
        bucket: "day",
        aggregation: "sum",
      }),
      HEALTH_CALL_MS,
    );
    aggregated = result?.samples ?? [];
  } catch {
    aggregated = [];
  }

  let raw: Array<{ startDate?: string; value?: number }> = [];
  if (pickStepSamples(aggregated, []).length === 0) {
    try {
      const result = await settleWithin(
        Health.readSamples({
          dataType: "steps",
          startDate: range.startIso,
          endDate: range.endIso,
          limit: 5000,
          ascending: true,
        }),
        HEALTH_CALL_MS,
      );
      raw = result?.samples ?? [];
    } catch {
      raw = [];
    }
  }

  const samples = pickStepSamples(aggregated, raw);
  const todayKey = localDateKeyFromIso(new Date().toISOString(), timeZone);
  const entries = aggregateStepSamples(samples, timeZone)
    .filter((row) => row.date >= range.startKey && row.steps > 0)
    .map((row) => ({
      date: row.date,
      steps: row.steps,
      source,
    }));

  const deduped = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    const prev = deduped.get(entry.date);
    if (!prev || entry.steps >= prev.steps) deduped.set(entry.date, entry);
  }
  const uniqueEntries = [...deduped.values()];

  const todaySteps = uniqueEntries.find((entry) => entry.date === todayKey)?.steps ?? 0;
  if (uniqueEntries.length === 0) return 0;

  await settleWithin(apiPost("/api/health/steps", { entries: uniqueEntries }), HEALTH_CALL_MS);
  notifyAnalyticsUpdated();
  dispatchStepsSynced(todaySteps);
  return uniqueEntries.length;
}

function dispatchStepsSynced(todaySteps: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HEALTH_STEPS_SYNCED_EVENT, { detail: { todaySteps } }),
  );
}
