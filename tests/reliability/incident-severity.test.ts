import { describe, expect, it } from "vitest";
import {
  INCIDENT_SEVERITY,
  classifyIncident,
  SLO,
  ERROR_BUDGET,
} from "@/lib/reliability/incident-severity";

describe("incident severity taxonomy", () => {
  it("defines P1–P4 with ack and MTTR targets", () => {
    expect(INCIDENT_SEVERITY.P1.mttrMinutes).toBe(30);
    expect(INCIDENT_SEVERITY.P2.ackMinutes).toBe(30);
    expect(INCIDENT_SEVERITY.P4.mttrMinutes).toBeNull();
  });

  it("classifies database down as P1", () => {
    expect(classifyIncident({ databaseDown: true })).toBe("P1");
  });

  it("classifies degraded mode as P2", () => {
    expect(classifyIncident({ degradedMode: true })).toBe("P2");
  });

  it("classifies single cron failure as P3", () => {
    expect(classifyIncident({ singleCronFailed: true })).toBe("P3");
  });

  it("defaults to P4 for unknown signals", () => {
    expect(classifyIncident({})).toBe("P4");
  });
});

describe("SLO re-exports", () => {
  it("re-exports health SLO from scalability module", () => {
    expect(SLO.health.p95Ms).toBe(800);
    expect(ERROR_BUDGET.healthAvailability).toBe(0.999);
  });
});
