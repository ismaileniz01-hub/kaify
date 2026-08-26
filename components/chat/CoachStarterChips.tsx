"use client";

import { COACH_STARTERS } from "@/lib/chat/starters";
import type { ContactId } from "@/lib/contacts";
import { useLang } from "@/lib/lang-context";

export function CoachStarterChips({
  coachId,
  onPick,
}: {
  coachId: ContactId;
  onPick: (text: string) => void;
}) {
  const { t } = useLang();
  const starters = COACH_STARTERS[coachId];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {coachId === "leo" ? (
        <p className="w-full text-xs text-zinc-500">{t("chat.starter.leo.safety")}</p>
      ) : null}
      {starters.map((starter) => (
        <button
          key={starter.id}
          type="button"
          onClick={() => onPick(t(starter.promptKey as "chat.starter.kai.today"))}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200"
        >
          {t(starter.promptKey as "chat.starter.kai.today")}
        </button>
      ))}
    </div>
  );
}
