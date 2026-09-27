"use client";

import { apiPost } from "@/lib/api/client";
import { notifyAnalyticsUpdated } from "@/lib/analytics-client-cache";
import { aggregateStepSamples } from "@/lib/health/aggregate-samples";
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

  const platform = await getNativePlatform();
  const asked = typeof localStorage !== "undefined" && localStorage.getItem(ASKED_KEY) === "1";
  if (!asked) {
    if (typeof localStorage !== "undefined") localStorage.setItem(ASKED_KEY, "1");
    await Health.requestAuthorization({
      read: ["steps"],
      write: [],
      requestHistoryAccess: true,
    });
    const after = await stepsAuthorizationGranted();
    if (after === false) {
      writeConnectedFlag(false);
      return false;
    }
    writeConnectedFlag(true);
    return true;
  }

  // Already asked. iOS still hides the grant, so try a read.
  if (platform === "ios" || readConnectedFlag()) return true;
  return false;
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
    if (granted === true) return "connected";
    if (readConnectedFlag() || (await getNativePlatform()) === "ios") {
      return readConnectedFlag() ? "connected" : "disconnected";
    }
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

export async function syncNativeHealthSteps(): Promise<number> {
  if (!(await isNativePlatform())) return 0;
  if (!(await ensureStepAccess())) return 0;

  const Health = await loadHealthPlugin();
  const platform = await getNativePlatform();
  const source = platform === "ios" ? "healthkit" : "google_fit";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  let samples: Array<{ startDate: string; value: number }> = [];
  try {
    const aggregated = await Health.queryAggregated({
      dataType: "steps",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: "day",
    });
    samples = (aggregated.samples ?? []).map((sample) => ({
      startDate: sample.startDate,
      value: sample.value,
    }));
  } catch {
    const raw = await Health.readSamples({
      dataType: "steps",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 5000,
      ascending: true,
    });
    samples = (raw.samples ?? []).map((sample) => ({
      startDate: sample.startDate,
      value: sample.value,
    }));
  }

  const entries = aggregateStepSamples(samples, timeZone)
    .filter((row) => row.date >= start.toISOString().slice(0, 10))
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

  if (uniqueEntries.length === 0) return 0;

  await apiPost("/api/health/steps", { entries: uniqueEntries });
  notifyAnalyticsUpdated();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HEALTH_STEPS_SYNCED_EVENT));
  }
  return uniqueEntries.length;
}
