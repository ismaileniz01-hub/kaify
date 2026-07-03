import { headers } from "next/headers";
import { logger } from "@/lib/logger";

/**
 * Reads the per-request correlation id injected by middleware (`x-request-id`).
 * Returns null outside a request scope.
 */
export async function getRequestId(): Promise<string | null> {
  try {
    return (await headers()).get("x-request-id");
  } catch {
    return null;
  }
}

/** Returns a logger scoped to the current request's correlation id. */
export async function requestLogger() {
  const requestId = await getRequestId();
  return requestId ? logger.child({ requestId }) : logger;
}
