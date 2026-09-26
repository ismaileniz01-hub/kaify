/**
 * Interactive Coach Council turn machine (KAIOS).
 *
 * One conversational model per turn. Supports await_user.
 * Not a one-shot fake group chat.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { canUseTeamChat } from "@/lib/billing/team-chat-access";
import { ModelRouter } from "@/lib/ai/model-router";
import { TOKEN_BUDGET } from "@/lib/ai/budget";
import {
  peekQuota,
  refundQuota,
  reserveQuota,
  settleQuota,
} from "@/lib/ai/quota-guard";
import { sanitizeUserText, wrapUntrustedInput } from "@/lib/ai/prompt-safety";
import { extractJsonObject } from "@/lib/ai/extract-json";
import type { ChatTurn } from "@/lib/ai/types";
import { mapChatMessageRow, type ChatMessageDTO } from "@/lib/types/domain.types";
import { CHAT_MESSAGE_LIST_COLUMNS } from "@/lib/services/chat-message-columns";
import { resolveLocale } from "@/lib/i18n/dictionary";
import { buildReplyLanguageDirective } from "@/lib/i18n/reply-language-directive";
import { getAnalyticsBundle } from "@/lib/services/analytics.service";
import { getStreakStatus } from "@/lib/services/streak-status.service";
import { teamMeetingWeekKey } from "@/lib/team/meeting-week";
import { loadCrossCoachSnapshot } from "@/lib/kaios/context/coach-snapshot";
import { formatTrustedProfileContext } from "@/lib/ai/chat-context";
import { COUNCIL_CORE, COUNCIL_ROLE_DIGESTS } from "@/lib/kaios/capsules/council";
import { KAI_MODE_COUNCIL } from "@/lib/kaios/capsules/kai";
import { resolveActiveLocale } from "@/lib/kaios/localization/resolve";
import { CORE_CAPSULE, SAFETY_CAPSULE } from "@/lib/kaios/capsules";
import {
  SCHEMA_VERSION,
  parseCouncilTurnResponse,
} from "@/lib/kaios/schemas/envelope";
import { emitKaiosEventBestEffort } from "@/lib/kaios/events";
import {
  coachRetryLine,
  isUsableCoachReply,
  sanitizeCoachVisibleText,
  scrubAlexGenderedAddress,
} from "@/lib/kaios/coach-retry";
import { isReplyLanguageMismatch } from "@/lib/i18n/reply-language-guard";
import type { Json } from "@/lib/types/database.types";

export { teamMeetingWeekKey } from "@/lib/team/meeting-week";

type CouncilSpeaker = {
  coachId: "alex" | "maya" | "leo" | "kai";
  text: string;
};

function weeklySnapshot(input: {
  name: string;
  streak: number;
  workouts: string;
  water: number;
  calories: string;
  protein: number;
  profile?: string;
  teammate?: string;
}): string {
  return [
    `user:${input.name}`,
    `streak:${input.streak}`,
    `training:${input.workouts}`,
    `hydration_l:${input.water}`,
    `calories:${input.calories}`,
    `protein_g:${input.protein}`,
    input.profile,
    input.teammate,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("; ");
}

export async function assertTeamChatUnlocked(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("team_chat_unlocked, tier")
    .eq("id", userId)
    .single();

  if (!canUseTeamChat({ tier: data?.tier, teamChatUnlocked: data?.team_chat_unlocked })) {
    const isEssential = !data?.tier || data.tier === "essential";
    throw new ApiError(
      "FORBIDDEN",
      isEssential
        ? "Team chat is available on Pro and Premium plans."
        : "Team chat unlocks after a 7-day streak.",
    );
  }
}

export async function getTeamChatHistory(userId: string): Promise<ChatMessageDTO[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("chat_messages")
    .select(CHAT_MESSAGE_LIST_COLUMNS)
    .eq("user_id", userId)
    .eq("thread_type", "team")
    .order("created_at", { ascending: true })
    .limit(80);

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Takım sohbeti yüklenemedi.");
  }
  return (data ?? []).map(mapChatMessageRow);
}

async function releaseTeamMeetingWeek(userId: string, weekStart: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin
    .from("team_meeting_weeks")
    .delete()
    .eq("user_id", userId)
    .eq("week_start", weekStart);
}

async function claimTeamMeetingWeek(userId: string, weekStart: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("team_meeting_weeks").insert({
    user_id: userId,
    week_start: weekStart,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new ApiError("INTERNAL_ERROR", "Takım toplantısı doğrulanamadı.");
}

function tryParseCouncilJson(content: string): {
  speakers: CouncilSpeaker[];
  awaitUser: boolean;
  message: string;
  decision: unknown;
} | null {
  const extracted = extractJsonObject(content);
  if (!extracted.ok) return null;
  try {
    const raw = extracted.value as unknown;
    const parsed = parseCouncilTurnResponse(raw);
    if (parsed.ok) {
      const data = parsed.data.data;
      const rawSpeakers = data?.speakers ?? [];
      const speakers: CouncilSpeaker[] = rawSpeakers
        .map((s) => {
          const coachId = s.coach;
          const text = s.message;
          if (
            coachId === "alex" ||
            coachId === "maya" ||
            coachId === "leo" ||
            coachId === "kai"
          ) {
            return { coachId, text };
          }
          return null;
        })
        .filter((s): s is CouncilSpeaker => s != null);

      return {
        speakers:
          speakers.length > 0
            ? speakers
            : [{ coachId: "kai", text: parsed.data.message }],
        awaitUser: Boolean(data?.await_user),
        message: parsed.data.message,
        decision: data && "decision" in data ? data.decision : null,
      };
    }

    // Lenient fallback for coachId/text shape if envelope parse fails.
    const obj = raw as {
      message?: string;
      data?: {
        await_user?: boolean;
        speakers?: { coachId?: string; coach?: string; text?: string; message?: string }[];
        decision?: unknown;
      };
      speakers?: { coachId?: string; coach?: string; text?: string; message?: string }[];
      await_user?: boolean;
    };
    const list = obj.data?.speakers ?? obj.speakers ?? [];
    const speakers = list
      .map((s) => {
        const coachId = s.coachId ?? s.coach;
        const text = s.text ?? s.message;
        if (
          typeof text === "string" &&
          (coachId === "alex" ||
            coachId === "maya" ||
            coachId === "leo" ||
            coachId === "kai")
        ) {
          return { coachId, text } as CouncilSpeaker;
        }
        return null;
      })
      .filter((s): s is CouncilSpeaker => s != null);
    if (speakers.length === 0 && typeof obj.message !== "string") return null;
    return {
      speakers:
        speakers.length > 0
          ? speakers
          : [{ coachId: "kai", text: String(obj.message ?? content) }],
      awaitUser: Boolean(obj.data?.await_user ?? obj.await_user),
      message: String(obj.message ?? ""),
      decision: obj.data?.decision ?? null,
    };
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * Start or continue an interactive Council turn.
 * - No userMessage → opening (await_user typically true)
 * - With userMessage → respond to the user (may decide or keep awaiting)
 */
export async function runCouncilTurn(params: {
  userId: string;
  userMessage?: string;
}): Promise<{
  messages: ChatMessageDTO[];
  awaitUser: boolean;
  decisionComplete: boolean;
}> {
  await assertTeamChatUnlocked(params.userId);
  const admin = createAdminSupabaseClient();
  const weekStart = teamMeetingWeekKey();

  const history = await getTeamChatHistory(params.userId);
  const isOpening = !params.userMessage?.trim();
  const alreadyStarted = history.some((m) => m.messageType === "team_meeting");

  let weekClaimed = false;
  if (isOpening) {
    if (alreadyStarted) {
      // Resume: if last payload awaits user, do not regenerate opening.
      const last = [...history].reverse().find((m) => m.sender === "coach");
      const awaitUser =
        last?.payload &&
        typeof last.payload === "object" &&
        (last.payload as { data?: { await_user?: boolean } }).data?.await_user ===
          true;
      return { messages: history, awaitUser: Boolean(awaitUser), decisionComplete: false };
    }
    weekClaimed = await claimTeamMeetingWeek(params.userId, weekStart);
    if (!weekClaimed) {
      throw new ApiError("CONFLICT", "Bu hafta takım toplantısı zaten yapıldı.");
    }
  } else if (!alreadyStarted) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Önce takım toplantısını başlatmalısın.",
    );
  }

  const [
    analytics,
    streak,
    { data: profile },
    { data: settings },
    { data: equipment },
    teammate,
  ] =
    await Promise.all([
      getAnalyticsBundle(params.userId),
      getStreakStatus(params.userId),
      admin
        .from("profiles")
        .select(
          "display_name, locale, gender, experience_level, training_days_per_week, activity_level, dietary_preference, allergies, health_conditions, disliked_foods, height_cm, weight_kg",
        )
        .eq("id", params.userId)
        .single(),
      admin
        .from("user_settings")
        .select("primary_goal")
        .eq("user_id", params.userId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("equipment_access")
        .eq("id", params.userId)
        .maybeSingle(),
      loadCrossCoachSnapshot(params.userId).catch(() => ""),
    ]);

  const savedLocale = resolveLocale(profile?.locale);
  const locale = resolveActiveLocale({
    savedLocale,
    fallbackLocale: "en",
  });
  const name = sanitizeUserText(profile?.display_name ?? "User", 60) || "User";
  const userGender =
    profile?.gender === "male" || profile?.gender === "female"
      ? profile.gender
      : null;
  const profileFacts = [
    typeof settings?.primary_goal === "string" && settings.primary_goal
      ? `primary_goal: ${settings.primary_goal}`
      : "",
    formatTrustedProfileContext({
      experienceLevel: profile?.experience_level ?? null,
      trainingDaysPerWeek: profile?.training_days_per_week ?? null,
      activityLevel: profile?.activity_level ?? null,
      heightCm: profile?.height_cm ?? null,
      weightKg: profile?.weight_kg ?? null,
      dietaryPreference: profile?.dietary_preference ?? null,
      dislikedFoods: profile?.disliked_foods ?? null,
      healthConditions: profile?.health_conditions ?? null,
      equipmentAccess: equipment?.equipment_access ?? null,
    }),
    userGender ? `user_gender: ${userGender}` : "",
    typeof profile?.allergies === "string" && profile.allergies.trim()
      ? `allergies: ${profile.allergies.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("; ");
  const snapshot = weeklySnapshot({
    name,
    streak: streak.currentStreak,
    workouts: `${analytics.today.workoutsCompleted}/${analytics.today.workoutsTarget}`,
    water: analytics.today.waterLiters,
    calories: `${analytics.today.caloriesConsumed}/${analytics.today.calorieGoal}`,
    protein: analytics.today.proteinG,
    profile: profileFacts,
    teammate,
  });

  const recentCouncil = history
    .slice(-12)
    .map((m) => `${m.coachId ?? m.sender}: ${m.content ?? ""}`)
    .join("\n");

  const tokenReserve = TOKEN_BUDGET.teamChat;
  try {
    await reserveQuota({
      userId: params.userId,
      resource: "text_tokens",
      amount: tokenReserve,
    });
  } catch (error) {
    if (weekClaimed) await releaseTeamMeetingWeek(params.userId, weekStart);
    throw error;
  }

  const phase = isOpening
    ? "OPENING: Kai opens briefly, invite the user to check in. Set await_user=true. At most 2 speakers. Do NOT invent the user's reply."
    : "CONTINUE: Respond to the user's real message. Prefer 1–2 relevant coaches. If ready for a Team Decision, include data.decision and set await_user=false; otherwise await_user=true.";

  const system = [
    CORE_CAPSULE,
    SAFETY_CAPSULE,
    COUNCIL_CORE,
    COUNCIL_ROLE_DIGESTS,
    KAI_MODE_COUNCIL,
    phase,
    buildReplyLanguageDirective(resolveLocale(locale)),
    `Return ONLY JSON: { "schema_version":"${SCHEMA_VERSION}", "coach":"council", "message":"<short kai transition or summary>", "intent":"council_turn", "data": { "await_user": true|false, "speakers":[{ "coach":"kai"|"alex"|"maya"|"leo", "message":"..." }], "decision": null|object } }`,
  ].join("\n\n");

  const userContent = [
    "Weekly snapshot (DATA):",
    wrapUntrustedInput("WEEKLY_SNAPSHOT", snapshot),
    recentCouncil
      ? `Recent council turns (DATA):\n${wrapUntrustedInput("COUNCIL_HISTORY", sanitizeUserText(recentCouncil, 3000))}`
      : "",
    params.userMessage
      ? `Current user message (DATA):\n${wrapUntrustedInput("USER_MESSAGE", sanitizeUserText(params.userMessage, 2000))}`
      : "No user message yet — produce the opening only.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatTurn[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  let content: string;
  let usageTokens = 0;
  try {
    const result = await ModelRouter.completeText(messages, {
      temperature: 0.7,
      maxTokens: TOKEN_BUDGET.teamChat,
      usageContext: { userId: params.userId, operation: "council_turn" },
    });
    content = result.content;
    usageTokens = result.usage?.total_tokens ?? tokenReserve;
  } catch (error) {
    await refundQuota({
      userId: params.userId,
      resource: "text_tokens",
      amount: tokenReserve,
    });
    throw error;
  }

  const parsed = tryParseCouncilJson(content);
  const speakers: CouncilSpeaker[] = parsed?.speakers?.length
    ? parsed.speakers.slice(0, 3)
    : [{ coachId: "kai", text: sanitizeUserText(content, 500) }];
  const awaitUser = parsed ? parsed.awaitUser : isOpening;
  const decisionComplete = Boolean(
    parsed && !awaitUser && parsed.decision != null && parsed.decision !== false,
  );

  // Persist user message if any
  if (params.userMessage?.trim()) {
    await admin.from("chat_messages").insert({
      user_id: params.userId,
      coach_id: "kai",
      thread_type: "team",
      sender: "user",
      message_type: "text",
      content: sanitizeUserText(params.userMessage, 4000),
      locale,
    });
  }

  const decision = parsed?.decision ?? null;
  const rows = speakers.map((s, i) => {
    const isLast = i === speakers.length - 1;
    let visible = sanitizeCoachVisibleText(s.text, locale, s.coachId);
    if (isReplyLanguageMismatch(visible, locale) && !isUsableCoachReply(visible)) {
      visible = coachRetryLine(locale);
    }
    if (s.coachId === "alex") {
      visible = scrubAlexGenderedAddress({
        text: visible,
        locale,
        userGender,
      });
    }
    return {
      user_id: params.userId,
      coach_id: s.coachId,
      thread_type: "team" as const,
      sender: "coach" as const,
      message_type: "team_meeting" as const,
      content: visible,
      payload: {
        schema_version: SCHEMA_VERSION,
        coach: "council",
        intent: decisionComplete ? "council_decision" : "council_turn",
        data: {
          await_user: isLast ? awaitUser : false,
          speaker: s.coachId,
          ...(isLast && decision != null ? { decision } : {}),
        },
      } as unknown as Json,
      tokens_used: i === 0 ? usageTokens : 0,
      locale,
    };
  });

  const { data: inserted, error } = await admin
    .from("chat_messages")
    .insert(rows)
    .select(CHAT_MESSAGE_LIST_COLUMNS);

  if (error) {
    await refundQuota({
      userId: params.userId,
      resource: "text_tokens",
      amount: tokenReserve,
    });
    if (weekClaimed) await releaseTeamMeetingWeek(params.userId, weekStart);
    throw new ApiError("INTERNAL_ERROR", "Takım mesajları kaydedilemedi.");
  }

  if (decisionComplete && decision != null) {
    // Team Decision already persisted on chat_messages payload.
    await emitKaiosEventBestEffort({
      category: "council",
      type: "council_decision",
      userId: params.userId,
      payload: { decision, weekStart },
      at: new Date().toISOString(),
    });
  }

  const extra = usageTokens - tokenReserve;
  if (extra > 0) {
    await settleQuota({
      userId: params.userId,
      resource: "text_tokens",
      amount: extra,
    });
  } else if (extra < 0) {
    await refundQuota({
      userId: params.userId,
      resource: "text_tokens",
      amount: -extra,
    });
  } else {
    await peekQuota({ userId: params.userId, resource: "text_tokens" });
  }

  return {
    messages: (inserted ?? []).map(mapChatMessageRow),
    awaitUser,
    decisionComplete,
  };
}

/** Legacy-compatible entry used by existing route when KAIOS council is on. */
export async function generateWeeklyTeamMeeting(
  userId: string,
): Promise<ChatMessageDTO[]> {
  const result = await runCouncilTurn({ userId });
  return result.messages;
}
