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
    const Health = await loadHealthPlugin();
    await Health.requestAuthorization({ read: [], write: [] }).catch(() => undefined);
  } catch {
    // Plugin absence must not leave the app in a connected state.
  }
  return "disconnected";
}

async function loadHealthPlugin() {
  const { Health } = await import("@capgo/capacitor-health");
  return Health;
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

async function stepsAuthorizationGranted(): Promise<boolean | null> {
  try {
    const Health = await loadHealthPlugin();
    const auth = await Health.checkAuthorization({ read: ["steps"] });
    return interpretStepAuthorization(auth);
  } catch {
    return null;
  }
}

const ASKED_KEY = "kaify:health-steps-asked";

async function ensureStepAccess(): Promise<boolean> {
  const Health = await loadHealthPlugin();
  const availability = await Health.isAvailable();
  if (!availability.available) {
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
    try {
      await Health.requestAuthorization({
        read: ["steps"],
        write: [],
        requestHistoryAccess: true,
      });
    } catch {
      // The sheet can fail to open. A read still succeeds when access already exists.
    }
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
  if (!(await isNativePlatform())) return "web";
  try {
    const Health = await loadHealthPlugin();
    const availability = await Health.isAvailable();
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
  if (!(await isNativePlatform())) return "web";
  const Health = await loadHealthPlugin();
  const availability = await Health.isAvailable();
  if (!availability.available) {
    writeConnectedFlag(false);
    return "unavailable";
  }

  if (typeof localStorage !== "undefined") localStorage.setItem(ASKED_KEY, "1");
  await Health.requestAuthorization({
    read: ["steps"],
    write: [],
    requestHistoryAccess: true,
  });
  const granted = await stepsAuthorizationGranted();
  if (granted === false) {
    writeConnectedFlag(false);
    return "denied";
  }

  writeConnectedFlag(true);
  await syncNativeHealthSteps();
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
  if (!(await isNativePlatform())) return 0;
  if (!(await ensureStepAccess())) return 0;

  const Health = await loadHealthPlugin();
  const platform = await getNativePlatform();
  const source = platform === "ios" ? "healthkit" : "google_fit";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const range = stepReadWindow(new Date(), timeZone);

  let aggregated: Array<{ startDate?: string; value?: number; values?: { sum?: number } }> = [];
  try {
    const result = await Health.queryAggregated({
      dataType: "steps",
      startDate: range.startIso,
      endDate: range.endIso,
      bucket: "day",
      aggregation: "sum",
    });
    aggregated = result.samples ?? [];
  } catch {
    aggregated = [];
  }

  let raw: Array<{ startDate?: string; value?: number }> = [];
  if (pickStepSamples(aggregated, []).length === 0) {
    try {
      const result = await Health.readSamples({
        dataType: "steps",
        startDate: range.startIso,
        endDate: range.endIso,
        limit: 5000,
        ascending: true,
      });
      raw = result.samples ?? [];
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

  await apiPost("/api/health/steps", { entries: uniqueEntries });
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
