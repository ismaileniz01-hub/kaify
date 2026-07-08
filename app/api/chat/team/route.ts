import { NextRequest } from "next/server";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import {
  assertTeamChatUnlocked,
  generateWeeklyTeamMeeting,
  getTeamChatHistory,
} from "@/lib/services/team-chat.service";

export const dynamic = "force-dynamic";

function currentWeekKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

/** GET /api/chat/team — team chat history (Pro / Premium only) */
export const GET = defineRoute(
  { route: "GET /api/chat/team" },
  async ({ user }) => {
    await assertTeamChatUnlocked(user.id);
    const messages = await getTeamChatHistory(user.id);
    return { messages };
  },
);

/** POST /api/chat/team — generate weekly team meeting (once per week) */
export const POST = defineRoute(
  {
    route: "POST /api/chat/team",
    rateLimit: "team_meeting",
    requireAi: true,
    requireAiConsent: true,
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
