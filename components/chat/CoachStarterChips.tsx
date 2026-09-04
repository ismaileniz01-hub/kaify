"use client";

import { COACH_STARTERS } from "@/lib/chat/starters";
import type { ContactId } from "@/lib/contacts";
import { useLang } from "@/lib/lang-context";
import { hapticSelection } from "@/lib/native/haptics";

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
          onClick={() => {
            void hapticSelection();
            onPick(t(starter.promptKey as "chat.starter.kai.today"));
          }}
          className="min-h-11 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-200"
        >
          {t(starter.promptKey as "chat.starter.kai.today")}
        </button>
      ))}
    </div>
  );
}
