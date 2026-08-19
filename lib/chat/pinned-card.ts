import type { ContactId } from "@/lib/contacts";
import { extractPhysiqueFromLeoPayload } from "@/lib/kaios/context/physique-summary";
import { resolveWorkoutPlanDays } from "@/lib/kaios/plan-speech";
import type { MessageType } from "@/lib/types/database.types";

export type PinnableChatMessage = {
  from: string;
  streaming?: boolean;
  messageType?: MessageType | string;
  payload?: unknown;
  text?: string;
};

function isCoachSide(from: string): boolean {
  return from === "coach" || from === "contact";
}

export function isAlexProgramMessage(msg: PinnableChatMessage): boolean {
  if (!isCoachSide(msg.from) || msg.streaming) return false;
  return resolveWorkoutPlanDays(msg.payload, msg.text).length > 0;
}

export function isLeoAnalysisMessage(msg: PinnableChatMessage): boolean {
  if (!isCoachSide(msg.from) || msg.streaming) return false;
  const type = msg.messageType;
  if (type !== "score" && type !== "photo_analysis") return false;
  return extractPhysiqueFromLeoPayload(msg.payload) != null;
}

export function findLatestPinnableMessage<T extends PinnableChatMessage>(
  coachId: ContactId,
  messages: T[],
): T | null {
  if (coachId !== "alex" && coachId !== "leo") return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (coachId === "alex" && isAlexProgramMessage(msg)) return msg;
    if (coachId === "leo" && isLeoAnalysisMessage(msg)) return msg;
  }
  return null;
}

export function pinnedCardMetric(
  coachId: ContactId,
  msg: PinnableChatMessage,
): string {
  if (coachId === "alex") {
    const days = resolveWorkoutPlanDays(msg.payload, msg.text).length;
    return days > 0 ? String(days) : "";
  }
  const overall = extractPhysiqueFromLeoPayload(msg.payload)?.overall;
  return overall != null ? String(overall) : "";
}
