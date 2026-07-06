export {
  INCIDENT_SEVERITY,
  classifyIncident,
  type IncidentLevel,
  SLO,
  ERROR_BUDGET,
} from "@/lib/reliability/incident-severity";

export {
  resilient,
  classifyError,
  withRetry,
  withCircuit,
  CircuitOpenError,
} from "@/lib/resilience";

export {
  getDegradedState,
  enterDegradedMode,
  exitDegradedMode,
  type DegradedState,
} from "@/lib/resilience/degraded-mode";

export {
  recordApiError,
  getErrorMonitorSnapshot,
  type SpikeCheck,
} from "@/lib/resilience/error-monitor";
