"use client";

import { Lightbulb } from "lucide-react";

export type WorkoutPlanCardExercise = {
  name: string;
  setsLabel?: string;
  notes?: string;
};

export type WorkoutPlanCardDay = {
  day: string;
  focus: string;
  exercises: WorkoutPlanCardExercise[];
};

type WorkoutPlanCardProps = {
  primary: string;
  primaryLight: string;
  ring: string;
  title: string;
  subtitle: string;
  days: WorkoutPlanCardDay[];
  tipsLabel?: string;
  tips?: string[];
  className?: string;
};

const FOCUS_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

export function WorkoutPlanCard({
  primary,
  primaryLight,
  ring,
  title,
  subtitle,
  days,
  tipsLabel,
  tips,
  className,
}: WorkoutPlanCardProps) {
  const dayCount = days.length;
  const ringPct = Math.min(100, Math.round((dayCount / 7) * 100));

  return (
    <div
      className={`chat-card-unfold overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{
        backgroundColor: `${primary}10`,
        border: `1px solid ${ring}`,
        boxShadow: `0 0 20px ${ring}`,
      }}
    >
      <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
          style={{
            background: `conic-gradient(${primary} ${ringPct}%, #1a1a2e ${ringPct}%)`,
            boxShadow: `0 0 15px ${ring}`,
          }}
        >
          {dayCount}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="truncate text-xs text-zinc-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-2">
        {days.map((day, di) => {
          const focusColor = FOCUS_COLORS[di % FOCUS_COLORS.length]!;
          return (
            <div
              key={`${day.day}-${di}`}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: `${primary}14` }}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${primaryLight})`,
                  }}
                >
                  {di + 1}
                </div>
                <p className="min-w-0 flex-1 truncate text-xs font-bold text-white">
                  {day.day}
                </p>
                {day.focus ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${focusColor}22`, color: focusColor }}
                  >
                    {day.focus}
                  </span>
                ) : null}
              </div>
              {day.exercises.map((ex, ei) => (
                <div key={`${ex.name}-${ei}`} className="flex items-start gap-2 py-1">
                  <span className="mt-0.5 w-4 shrink-0 text-[10px] font-bold text-zinc-500">
                    {ei + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-medium text-white">
                        {ex.name}
                      </span>
                      {ex.setsLabel ? (
                        <span
                          className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: `${primary}33`,
                            color: primaryLight,
                          }}
                        >
                          {ex.setsLabel}
                        </span>
                      ) : null}
                    </div>
                    {ex.notes ? (
                      <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                        {ex.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {tips && tips.length > 0 ? (
        <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: `1px solid ${ring}` }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Lightbulb className="h-3.5 w-3.5" />
            {tipsLabel}
          </p>
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: primary }}
              />
              <span className="text-[11px] leading-relaxed text-zinc-300">{tip}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
