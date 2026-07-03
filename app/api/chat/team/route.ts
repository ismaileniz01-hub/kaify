import { requireUser } from "@/lib/api/auth-guard";
import { enforceUserRateLimit } from "@/lib/api/rate-guard";
import { handleApiError, ok } from "@/lib/api/response";
import {
  generateWeeklyTeamMeeting,
  getTeamChatHistory,
} from "@/lib/services/team-chat.service";

export const dynamic = "force-dynamic";

/** GET /api/chat/team — team chat history */
export async function GET() {
  try {
    const user = await requireUser();
    const messages = await getTeamChatHistory(user.id);
    return ok({ messages });
  } catch (error) {
    return handleApiError(error, { route: "/api/chat/team" });
  }
}

/** POST /api/chat/team — generate weekly team meeting (once per week) */
export async function POST() {
  try {
    const user = await requireUser();
    await enforceUserRateLimit(user.id, "team_meeting");
    const messages = await generateWeeklyTeamMeeting(user.id);
    return ok({ messages });
  } catch (error) {
    return handleApiError(error, { route: "/api/chat/team" });
  }
}
