import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import { AI_FEATURES } from "@/lib/ai/budget";
import {
  assertTeamChatUnlocked,
  generateWeeklyTeamMeeting,
  getTeamChatHistory,
  teamMeetingWeekKey,
  runCouncilTurn,
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

type TeamPostBody = {
  message?: string;
};

/** POST /api/chat/team — start/continue weekly council (or legacy oneshot). */
export const POST = defineRoute(
  {
    route: "POST /api/chat/team",
    rateLimit: "team_meeting",
    requireAi: true,
    requireAiConsent: true,
    requireTermsConsent: true,
    dailyAiBudget: true,
  },
  async ({ user, request }) => {
    let body: TeamPostBody = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const msg = (raw as { message?: unknown }).message;
        if (typeof msg === "string") {
          body = { message: msg };
        }
      }
    } catch {
      body = {};
    }

    const userMessage = body.message?.trim() ? body.message.trim() : undefined;

    if (AI_FEATURES.kaiosRuntime) {
      if (!userMessage) {
        const week = teamMeetingWeekKey();
        const idempotencyKey = `team_meeting:${user.id}:${week}`;
        return withIdempotency({
          userId: user.id,
          endpoint: "POST /api/chat/team",
          key: idempotencyKey,
          requestBody: { week, kaios: true },
          handler: () => runCouncilTurn({ userId: user.id }),
        });
      }
      return runCouncilTurn({ userId: user.id, userMessage });
    }

    const week = teamMeetingWeekKey();
    const idempotencyKey = `team_meeting:${user.id}:${week}`;

    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/chat/team",
      key: idempotencyKey,
      requestBody: { week },
      handler: async () => {
        const messages = await generateWeeklyTeamMeeting(user.id);
        return { messages, awaitUser: false, decisionComplete: true };
      },
    });
  },
);
