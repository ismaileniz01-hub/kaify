"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { FirstTaskProgress } from "@/lib/activation/today-job";
import { useLang } from "@/lib/lang-context";

type Props = {
  progress: FirstTaskProgress;
  onGoalsClick?: () => void;
  onChatMarked?: () => void;
};

export function FirstTaskChecklist({
  progress,
  onGoalsClick,
  onChatMarked,
}: Props) {
  const { t } = useLang();
  const doneCount =
    Number(progress.checkInDone) +
    Number(progress.goalsDone) +
    Number(progress.chatDone);

  if (doneCount >= 3) return null;

  const steps: Array<{
    id: "check_in" | "goals" | "chat";
    done: boolean;
    label: string;
    href: string | null;
    onClick?: () => void;
    onNavigate?: () => void;
  }> = [
    {
      id: "check_in",
      done: progress.checkInDone,
      label: t("home.first_task.check_in"),
      href: "/streak",
    },
    {
      id: "goals",
      done: progress.goalsDone,
      label: t("home.first_task.goals"),
      href: null,
      onClick: onGoalsClick,
    },
    {
      id: "chat",
      done: progress.chatDone,
      label: t("home.first_task.chat"),
      href: "/chat/kai",
      onNavigate: onChatMarked,
    },
  ];

  return (
    <section
      aria-label={t("home.first_task.title")}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {t("home.first_task.title")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {t("home.first_task.subtitle", { done: doneCount, total: 3 })}
          </p>
        </div>
        <p className="text-xs font-bold text-purple-300">{doneCount}/3</p>
      </div>

      <ul className="mt-3 space-y-2">
        {steps.map((step) => {
          const row = (
            <span className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/5">
              {step.done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-zinc-500" />
              )}
              <span
                className={`text-sm ${
                  step.done ? "text-zinc-500 line-through" : "text-zinc-200"
                }`}
              >
                {step.label}
              </span>
            </span>
          );

          if (step.done) {
            return (
              <li key={step.id} className="opacity-70">
                {row}
              </li>
            );
          }

          if (step.id === "goals" && step.onClick) {
            return (
              <li key={step.id}>
                <button type="button" className="w-full text-left" onClick={step.onClick}>
                  {row}
                </button>
              </li>
            );
          }

          return (
            <li key={step.id}>
              <Link
                href={step.href ?? "/welcome"}
                className="block"
                onClick={step.onNavigate}
              >
                {row}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
