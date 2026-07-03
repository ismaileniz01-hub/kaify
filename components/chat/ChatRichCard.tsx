"use client";

import { Activity, Dumbbell, Target, TrendingUp } from "lucide-react";
import type { ContactId } from "@/lib/contacts";
import { CONTACTS } from "@/lib/contacts";
import { useLang } from "@/lib/lang-context";
import type { MessageType } from "@/lib/types/database.types";

type ChatRichCardProps = {
  contactId: ContactId;
  messageType: MessageType;
  payload: unknown;
};

const SCORE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e", "#a855f7", "#ec4899"];

function scorePayloadToAnalysis(payload: Record<string, unknown>) {
  const analysis = (payload.analysis ?? payload) as Record<string, unknown>;
  const rawScores = (analysis.scores ?? {}) as Record<string, unknown>;
  // Muscle scores are on a 0-100 scale (see vision prompt). Keep only numeric
  // entries and clamp defensively so a stray value never breaks the bars.
  const categories = Object.entries(rawScores)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([key, score], i) => ({
      key: `analysis.${key}`,
      score: Math.min(100, Math.max(0, score as number)),
      maxScore: 100,
      color: SCORE_COLORS[i % SCORE_COLORS.length],
    }));
  const overallRaw = analysis.overall_score;
  const values = categories.map((c) => c.score);
  const overallScore =
    typeof overallRaw === "number" && Number.isFinite(overallRaw)
      ? Math.round(Math.min(100, Math.max(0, overallRaw)))
      : values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
  return {
    overallScore,
    categories,
    tips: Array.isArray(analysis.tips) ? (analysis.tips as string[]) : [],
  };
}

export function ChatRichCard({ contactId, messageType, payload }: ChatRichCardProps) {
  const { t } = useLang();
  const contact = CONTACTS[contactId];
  const { primary, primaryLight, ring } = contact.color;

  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  // Food analysis (Maya) — macro/calorie card. Kept separate from the body
  // score card so a meal photo never renders an empty "Body Analysis Score".
  if (messageType === "analysis") {
    const analysis = (p.analysis ?? p) as Record<string, unknown>;
    const food = analysis.food_analysis as
      | { calories?: number; protein?: number; carb?: number; fat?: number }
      | null
      | undefined;
    if (!food) return null;

    const cal = Math.round(food.calories ?? 0);
    const macros: { key: string; label: string; grams: number; color: string }[] = [
      { key: "protein", label: t("analysis.protein"), grams: Math.round(food.protein ?? 0), color: "#22c55e" },
      { key: "carb", label: t("analysis.carb"), grams: Math.round(food.carb ?? 0), color: "#f59e0b" },
      { key: "fat", label: t("analysis.fat"), grams: Math.round(food.fat ?? 0), color: "#ef4444" },
    ];
    const totalG = macros.reduce((sum, m) => sum + m.grams, 0) || 1;

    return (
      <div
        className="animate-message mt-2 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: `${primary}10`,
          border: `1px solid ${ring}`,
          boxShadow: `0 0 20px ${ring}`,
        }}
      >
        <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
          <div
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${primaryLight})` }}
          >
            <span className="text-base font-black leading-none">{cal}</span>
            <span className="text-[9px] leading-none opacity-80">kcal</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{t("analysis.calories")}</p>
            <p className="text-xs text-zinc-400">{t("analysis.macros")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {macros.map((m) => (
            <div key={m.key} className="flex items-center gap-2">
              <span className="w-24 truncate text-[11px] text-zinc-400">{m.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(m.grams / totalG) * 100}%`, backgroundColor: m.color }}
                />
              </div>
              <span className="w-10 text-right text-[11px] font-bold" style={{ color: m.color }}>
                {m.grams}g
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messageType === "score") {
    const a = scorePayloadToAnalysis(p);
    return (
      <div
        className="animate-message mt-2 overflow-hidden rounded-2xl"
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
              background: `conic-gradient(${primary} ${a.overallScore}%, #1a1a2e ${a.overallScore}%)`,
            }}
          >
            {a.overallScore}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{t("analysis.score")}</p>
            <p className="text-xs text-zinc-400">{t("analysis.overall")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3">
          {a.categories.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 truncate text-[11px] text-zinc-400">{t(cat.key)}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cat.score / cat.maxScore) * 100}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
              <span className="w-10 text-right text-[11px] font-bold" style={{ color: cat.color }}>
                {cat.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messageType === "meal_plan") {
    const mp = p as {
      totalCalories?: number;
      targetCalories?: number;
      macros?: Record<string, { current: number; target: number }>;
      meals?: { labelKey: string; items: { name: string; calories: number }[] }[];
    };
    const calPct = Math.round(
      ((mp.totalCalories ?? 0) / (mp.targetCalories ?? 2100)) * 100,
    );
    return (
      <div
        className="animate-message mt-2 overflow-hidden rounded-2xl"
        style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}` }}
      >
        <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
            style={{ background: `conic-gradient(${primary} ${calPct}%, #1a1a2e ${calPct}%)` }}
          >
            {calPct}%
          </div>
          <div>
            <p className="text-sm font-bold text-white">{t("meal.calories")}</p>
            <p className="text-xs text-zinc-400">
              {mp.totalCalories ?? 0} / {mp.targetCalories ?? 2100} kcal
            </p>
          </div>
        </div>
        {mp.macros && (
          <div className="flex flex-col gap-2 p-3">
            {Object.entries(mp.macros).map(([key, data]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-16 text-[11px] capitalize text-zinc-400">{key}</span>
                <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (data.current / data.target) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-zinc-400">
                  {data.current}g / {data.target}g
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (messageType === "workout_plan") {
    const wp = p as {
      titleKey?: string;
      durationKey?: string;
      days?: {
        dayKey: string;
        focusKey: string;
        exercises: { name: string; sets: number; reps: string; notes?: string }[];
      }[];
    };
    return (
      <div
        className="animate-message mt-2 overflow-hidden rounded-2xl"
        style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}` }}
      >
        <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${primary}, ${primaryLight})` }}
          >
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {wp.titleKey ? t(wp.titleKey) : t("workout.weekly_title")}
            </p>
            <p className="text-xs text-zinc-400">
              {wp.durationKey ? t(wp.durationKey) : ""}
            </p>
          </div>
        </div>
        {(wp.days ?? []).map((day, di) => (
          <div key={di} className="px-3 py-2" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="text-xs font-bold text-zinc-300">
              {t(day.dayKey)} — {t(day.focusKey)}
            </p>
            {day.exercises.map((ex, ei) => (
              <p key={ei} className="mt-1 text-[11px] text-zinc-400">
                • {ex.name} ({ex.sets}x{ex.reps})
              </p>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (messageType === "daily_summary") {
    const ds = p as {
      greeting?: string;
      workout?: { completed?: string; next?: string; status?: string };
      nutrition?: {
        calories?: { current: number; target: number };
        protein?: { current: number; target: number };
        highlight?: string;
      };
      bodyScore?: { focus?: string };
      motivation?: string;
    };
    const calPct = ds.nutrition?.calories
      ? Math.round((ds.nutrition.calories.current / ds.nutrition.calories.target) * 100)
      : 0;
    return (
      <div
        className="animate-message mt-2 overflow-hidden rounded-2xl"
        style={{ backgroundColor: `${primary}10`, border: `1px solid ${ring}` }}
      >
        <div className="flex items-center gap-3 p-3" style={{ borderBottom: `1px solid ${ring}` }}>
          <Activity className="h-6 w-6" style={{ color: primary }} />
          <p className="text-sm font-bold text-white">{ds.greeting ?? "Günlük Özet"}</p>
        </div>
        {ds.workout && (
          <div className="p-3 text-xs text-zinc-300" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="font-bold text-zinc-400">ANTRENMAN</p>
            <p>✅ {ds.workout.completed}</p>
            <p>⏭️ {ds.workout.next}</p>
            <p className="text-green-400">{ds.workout.status}</p>
          </div>
        )}
        {ds.nutrition && (
          <div className="p-3 text-xs" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="font-bold text-zinc-400">BESLENME</p>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
              <div className="h-full rounded-full" style={{ width: `${calPct}%`, backgroundColor: primary }} />
            </div>
            <p className="mt-1 text-zinc-300">{ds.nutrition.highlight}</p>
          </div>
        )}
        {ds.bodyScore?.focus && (
          <div className="p-3 text-xs text-zinc-300" style={{ borderBottom: `1px solid ${ring}` }}>
            <p className="flex items-center gap-1 font-bold text-zinc-400">
              <Target className="h-3 w-3" /> VÜCUT
            </p>
            <p>{ds.bodyScore.focus}</p>
          </div>
        )}
        {ds.motivation && (
          <div className="p-3 text-xs leading-relaxed text-zinc-200">
            <TrendingUp className="mb-1 inline h-3 w-3" /> {ds.motivation}
          </div>
        )}
      </div>
    );
  }

  return null;
}
