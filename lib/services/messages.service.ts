import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type InboxCoachDTO = {
  coachId: string;
  name: string;
  role: string;
  avatarUrl: string;
  preview: string;
  time: string;
  unreadCount: number;
};

const COACH_META: Record<
  string,
  { name: string; role: string; avatarUrl: string }
> = {
  alex: { name: "Alex", role: "Fitness Coach", avatarUrl: "/avatars/alex 1.png" },
  maya: { name: "Dr. Maya", role: "Nutritionist", avatarUrl: "/avatars/dr maya 1.png" },
  leo: { name: "Leo", role: "Body rater", avatarUrl: "/avatars/leo-1.png" },
  kai: { name: "Kai", role: "Teammate", avatarUrl: "/avatars/kai-1.png" },
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", day: "numeric" });
}

const DEFAULT_PREVIEW: Record<string, string> = {
  alex: "Ready for today's workout?",
  maya: "Your meal plan is ready 🥗",
  leo: "Upload a photo for analysis",
  kai: "Hey! How are you feeling today?",
};

type InboxPreviewRow = {
  coach_id: string;
  content: string | null;
  created_at: string;
  sender: string;
};

export async function getInbox(): Promise<InboxCoachDTO[]> {
  const supabase = await createServerSupabaseClient();
  const coachIds = ["alex", "maya", "leo", "kai"] as const;

  // Single round-trip: latest direct message per coach (RLS-scoped RPC).
  const { data, error } = await supabase.rpc("get_inbox_previews", {
    p_coach_ids: coachIds as unknown as string[],
  });

  if (error) {
    logger.error("[messages.service] inbox previews error", { error: error.message });
  }

  const latestByCoach = new Map<string, InboxPreviewRow>();
  for (const row of (data ?? []) as InboxPreviewRow[]) {
    latestByCoach.set(row.coach_id, row);
  }

  return coachIds.map((coachId) => {
    const latest = latestByCoach.get(coachId);
    const meta = COACH_META[coachId];
    const preview = latest?.content ?? DEFAULT_PREVIEW[coachId];

    return {
      coachId,
      name: meta.name,
      role: meta.role,
      avatarUrl: meta.avatarUrl,
      preview: preview.slice(0, 60),
      time: latest ? formatRelativeTime(latest.created_at) : "",
      unreadCount: latest?.sender === "coach" ? 1 : 0,
    };
  });
}
