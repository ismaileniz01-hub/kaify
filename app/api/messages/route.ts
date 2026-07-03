import { requireUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { getInbox } from "@/lib/services/messages.service";

export const dynamic = "force-dynamic";

/** GET /api/messages — inbox previews per coach. */
export async function GET() {
  try {
    await requireUser();
    const inbox = await getInbox();
    return ok({ inbox });
  } catch (error) {
    return handleApiError(error, { route: "/api/messages" });
  }
}
