"use client";

import Link from "next/link";
import { ArrowRight, Flame, MessageCircle, Target } from "lucide-react";
import type { TodayJob } from "@/lib/activation/today-job";
import { useLang } from "@/lib/lang-context";
import { hapticSelection } from "@/lib/native/haptics";

const ICONS = {
  check_in: Flame,
  set_goals: Target,
  chat_kai: MessageCircle,
  continue: ArrowRight,
} as const;

type Props = {
  job: TodayJob;
  onGoalsClick?: () => void;
};

export function TodaysJobCard({ job, onGoalsClick }: Props) {
  const { t } = useLang();
  const Icon = ICONS[job.kind] ?? ArrowRight;
  const title = t(job.titleKey as "home.today_job.check_in.title");
  const body = t(job.bodyKey as "home.today_job.check_in.body");
  const cta = t(job.ctaKey as "home.today_job.check_in.cta");

  const content = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-200/80">
          {t("home.today_job.label")}
        </p>
        <p className="mt-1 text-base font-bold text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-300">{body}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  );

  const className =
    "today-job-card flex w-full items-start gap-3 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 via-purple-500/10 to-zinc-950/80 p-4 transition hover:border-emerald-300/40";

  if (job.kind === "set_goals" && onGoalsClick) {
    return (
      <button
        type="button"
        onClick={() => {
          void hapticSelection();
          onGoalsClick();
        }}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={job.href}
      onClick={() => {
        void hapticSelection();
      }}
      className={className}
    >
      {content}
    </Link>
  );
}
