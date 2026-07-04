import { NextRequest } from "next/server";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { requireUser } from "@/lib/api/auth-guard";
import { defineRoute } from "@/lib/api/route-handler";
import { handleApiError, ok } from "@/lib/api/response";
import {
  generateWeeklyTeamMeeting,
  getTeamChatHistory,
} from "@/lib/services/team-chat.service";

export const dynamic = "force-dynamic";

function currentWeekKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

/** GET /api/chat/team — team chat history */
export async function GET() {
  try {
    const user = await requireUser();
    const messages = await getTeamChatHistory(user.id);
    return ok({ messages });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/chat/team" });
  }
}

/** POST /api/chat/team — generate weekly team meeting (once per week) */
export const POST = defineRoute(
  {
    route: "POST /api/chat/team",
    rateLimit: "team_meeting",
    requireAi: true,
    dailyAiBudget: true,
  },
  async ({ user, request }) => {
    const clientKey = getOptionalIdempotencyKey(request as NextRequest);
    const week = currentWeekKey();
    const idempotencyKey = clientKey ?? `team_meeting:${user.id}:${week}`;

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/chat/team",
      key: idempotencyKey,
      requestBody: { week },
      handler: () => generateWeeklyTeamMeeting(user.id),
    });
  },
);
