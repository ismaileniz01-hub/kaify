/**
 * Incident severity taxonomy — Reliability Faz 4 source of truth.
 * Keep in sync with docs/reliability/incident-response.md
 */

export const INCIDENT_SEVERITY = {
  P1: {
    level: "P1",
    name: "Critical",
    ackMinutes: 15,
    mttrMinutes: 30,
    examples: [
      "Full outage",
      "Database down",
      "All AI circuits open",
      "Auth broken",
    ],
  },
  P2: {
    level: "P2",
    name: "Major",
    ackMinutes: 30,
    mttrMinutes: 120,
    examples: [
      "Degraded mode active",
      "Single provider down",
      "Sustained 5xx spike",
    ],
  },
  P3: {
    level: "P3",
    name: "Minor",
    ackMinutes: 240,
    mttrMinutes: 1440,
    examples: [
      "Elevated latency",
      "Single cron failing",
      "Non-critical feature impaired",
    ],
  },
  P4: {
    level: "P4",
    name: "Low",
    ackMinutes: 1440,
    mttrMinutes: null,
    examples: ["Cosmetic", "Docs drift", "Non-user-facing regression"],
  },
} as const;

export type IncidentLevel = keyof typeof INCIDENT_SEVERITY;

/** Map operational signals to suggested severity (advisory — operator confirms). */
export function classifyIncident(signal: {
  databaseDown?: boolean;
  degradedMode?: boolean;
  allAiCircuitsOpen?: boolean;
  sustained5xxSpike?: boolean;
  singleCronFailed?: boolean;
}): IncidentLevel {
  if (signal.databaseDown || signal.allAiCircuitsOpen) return "P1";
  if (signal.degradedMode || signal.sustained5xxSpike) return "P2";
  if (signal.singleCronFailed) return "P3";
  return "P4";
}

export { ERROR_BUDGET, SLO } from "@/lib/scalability/slo";
