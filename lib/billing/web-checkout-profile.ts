import { apiGet } from "@/lib/api/client";
import type { ProfileDTO } from "@/lib/types/domain.types";

/**
 * Pricing lives on the marketing layout (no SessionProvider). Cookie-backed
 * GET /api/profile is how checkout learns the signed-in user id.
 */
export async function fetchWebCheckoutProfile(): Promise<ProfileDTO | null> {
  try {
    return await apiGet<ProfileDTO>("/api/profile");
  } catch {
    return null;
  }
}
