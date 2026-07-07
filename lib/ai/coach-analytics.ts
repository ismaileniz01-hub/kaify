import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ModelRouter } from "@/lib/ai/model-router";
import { TOKEN_BUDGET, AI_FEATURES } from "@/lib/ai/budget";
import { sanitizeUserText, wrapUntrustedInput } from "@/lib/ai/prompt-safety";
import { resolveLocale } from "@/lib/i18n/dictionary";
import { createPendingAnalyticsConfirmation } from "@/lib/services/analytics-confirmation.service";
import type { ChatTurn } from "@/lib/ai/types";
import type { Json } from "@/lib/types/database.types";

const LOGGING_HINT =
  /\d|yaptım|yaptim|bitirdim|tamamladım|tamamladim|attım|attim|içtim|ictim|yedim|kg\b|kalori|calorie|protein|karbonhidrat|carb|yağ|fat|gram|\bgr\b|litre|liter|\bml\b|\bsu\b|water|antren|workout|egzersiz|set|tekrar|\brep\b|koştum|kostum|yürü|walk|run/i;

type AnalyticsPatch = Partial<{
  workoutsCompleted: number;
  waterLiters: number;
  caloriesConsumed: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  caloriesBurned: number;
}>;

const COACH_FIELDS: Record<string, (keyof AnalyticsPatch)[]> = {
  alex: ["workoutsCompleted", "caloriesBurned"],
  maya: ["waterLiters", "caloriesConsumed", "proteinG", "carbsG", "fatG"],
  leo: [],
  kai: [],
};

function buildSummary(patch: Record<string, number>): string {
  const parts: string[] = [];
  if (patch.workoutsCompleted != null) parts.push(`${patch.workoutsCompleted} workout(s)`);
  if (patch.caloriesBurned != null) parts.push(`${patch.caloriesBurned} kcal burned`);
  if (patch.caloriesConsumed != null) parts.push(`${patch.caloriesConsumed} kcal eaten`);
  if (patch.proteinG != null) parts.push(`${patch.proteinG}g protein`);
  if (patch.carbsG != null) parts.push(`${patch.carbsG}g carbs`);
  if (patch.fatG != null) parts.push(`${patch.fatG}g fat`);
  if (patch.waterLiters != null) parts.push(`${patch.waterLiters}L water`);
  return parts.join(", ");
}

async function attachConfirmationToMessage(params: {
  userId: string;
  coachId: string;
  pendingId: string;
  summary: string;
  patch: Record<string, number>;
  attachToMessageId?: string | null;
}): Promise<{ content: string; messageId: string }> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", params.userId)
    .maybeSingle();
  const locale = resolveLocale(profile?.locale);

  const content =
    locale === "tr"
      ? `Harika iş! Analiz sayfana şunu eklememi onaylıyor musun? ${params.summary}`
      : `Great work! Should I add this to your analytics? ${params.summary}`;

  const confirmationData = {
    confirmation: {
      pendingId: params.pendingId,
      summary: params.summary,
      patch: params.patch,
    },
  };

  if (params.attachToMessageId) {
    const { data: existing } = await admin
      .from("chat_messages")
      .select("payload")
      .eq("id", params.attachToMessageId)
      .maybeSingle();

    const merged: Record<string, unknown> =
      existing?.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload)
        ? { ...(existing.payload as Record<string, unknown>), ...confirmationData }
        : confirmationData;

    await admin
      .from("chat_messages")
      .update({ payload: merged as unknown as Json })
      .eq("id", params.attachToMessageId);

    return { content, messageId: params.attachToMessageId };
  }

  const { data: inserted } = await admin
    .from("chat_messages")
    .insert({
      user_id: params.userId,
      coach_id: params.coachId,
      thread_type: "direct",
      sender: "coach",
      message_type: "text",
      content,
      payload: confirmationData as unknown as Json,
      locale,
    })
    .select("id")
    .single();

  return { content, messageId: inserted?.id ?? "" };
}

export async function applyCoachAnalyticsFromChat(params: {
  userId: string;
  coachId: string;
  userMessage: string;
  coachReply: string;
}): Promise<void> {
  if (!AI_FEATURES.chatAnalytics) return;

  const allowed = COACH_FIELDS[params.coachId];
  if (!allowed || allowed.length === 0) return;
  if (!LOGGING_HINT.test(params.userMessage)) return;

  const conversation = `Coach: ${params.coachId}\nUser: ${sanitizeUserText(params.userMessage, 2000)}\nCoach reply: ${sanitizeUserText(params.coachReply, 4000)}`;

  const messages: ChatTurn[] = [
    {
      role: "system",
      content: `Extract confirmed fitness/nutrition updates from the coach conversation. Return JSON only with numeric fields you are confident about (omit unknown): { "workoutsCompleted"?: number, "waterLiters"?: number, "caloriesConsumed"?: number, "proteinG"?: number, "carbsG"?: number, "fatG"?: number, "caloriesBurned"?: number }. Only include values the coach explicitly confirmed or logged. If nothing confirmed, return {}.`,
    },
    {
      role: "user",
      content: wrapUntrustedInput("CONVERSATION", conversation),
    },
  ];

  try {
    const { content } = await ModelRouter.completeText(messages, {
      temperature: 0,
      maxTokens: TOKEN_BUDGET.analytics,
      usageContext: { userId: params.userId, operation: "analytics" },
    });
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]) as AnalyticsPatch;
    const patch: Record<string, number> = {};

    for (const key of allowed) {
      const val = parsed[key];
      if (typeof val === "number" && Number.isFinite(val)) {
        patch[key] = val;
      }
    }

    if (Object.keys(patch).length === 0) return;

    const summary = buildSummary(patch);
    const pendingId = await createPendingAnalyticsConfirmation({
      userId: params.userId,
      coachId: params.coachId,
      source: "chat",
      payload: { summary, patch },
    });

    await attachConfirmationToMessage({
      userId: params.userId,
      coachId: params.coachId,
      pendingId,
      summary,
      patch,
    });
  } catch {
    // Non-fatal
  }
}

export type PhotoAnalyticsConfirmation = {
  pendingId: string;
  summary: string;
  content: string;
  messageId: string;
};

export async function requestPhotoAnalyticsConfirmation(params: {
  userId: string;
  coachId: string;
  meal?: { calories: number; protein: number; carbs: number; fat: number };
  bodyScore?: number;
  attachToMessageId?: string | null;
}): Promise<PhotoAnalyticsConfirmation | null> {
  const summary = params.meal
    ? buildSummary({
        caloriesConsumed: params.meal.calories,
        proteinG: params.meal.protein,
        carbsG: params.meal.carbs,
        fatG: params.meal.fat,
      })
    : params.bodyScore != null
      ? `body score ${params.bodyScore}/100`
      : "";

  if (!summary) return null;

  const patch = params.meal
    ? {
        caloriesConsumed: params.meal.calories,
        proteinG: params.meal.protein,
        carbsG: params.meal.carbs,
        fatG: params.meal.fat,
      }
    : undefined;

  const pendingId = await createPendingAnalyticsConfirmation({
    userId: params.userId,
    coachId: params.coachId,
    source: "photo",
    payload: {
      summary,
      patch,
      meal: params.meal,
    },
  });

  const { content, messageId } = await attachConfirmationToMessage({
    userId: params.userId,
    coachId: params.coachId,
    pendingId,
    summary,
    patch: patch ?? {},
    attachToMessageId: params.attachToMessageId,
  });

  return { pendingId, summary, content, messageId };
}
