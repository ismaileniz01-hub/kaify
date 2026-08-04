import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import {
  assertTeamChatUnlocked,
  generateWeeklyTeamMeeting,
  getTeamChatHistory,
  teamMeetingWeekKey,
} from "@/lib/domains/ai";

export const dynamic = "force-dynamic";

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
  async ({ user }) => {
    const week = teamMeetingWeekKey();
    // Server-owned key only — client Idempotency-Key must not bypass the weekly lock.
    const idempotencyKey = `team_meeting:${user.id}:${week}`;

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/chat/team",
      key: idempotencyKey,
      requestBody: { week },
      handler: () => generateWeeklyTeamMeeting(user.id),
    });
  },
);
