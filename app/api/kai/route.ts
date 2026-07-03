import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getKaiState } from "@/lib/services/kai-state.service";

export const dynamic = "force-dynamic";

/** GET /api/kai — unlocked level + active aura + owned effects */
export async function GET() {
  try {
    const user = await requireUser();
    const state = await getKaiState(user.id);
    return ok(state);
  } catch (error) {
    return handleApiError(error, { route: "/api/kai" });
  }
}
