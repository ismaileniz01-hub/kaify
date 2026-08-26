"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { InlineAlert } from "@/components/InlineAlert";
import type { WorkoutPlanDTO } from "@/lib/training/plan-dto";

export function WorkoutPlanCard() {
  const { t } = useLang();
  const [plan, setPlan] = useState<WorkoutPlanDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ plan: WorkoutPlanDTO | null }>("/api/workout/plan");
      setPlan(data.plan);
      setError(null);
    } catch {
      setPlan(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!plan || !plan.available) return null;

  const apply = async (slug: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiPost<{ plan: WorkoutPlanDTO }>("/api/workout/plan", {
        templateSlug: slug,
      });
      setPlan(data.plan);
    } catch {
      setError(t("workout.plan_error"));
    } finally {
      setBusy(false);
    }
  };

  const mark = async (status: "rest" | "missed" | "deload") => {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/workout/session", { status });
      await load();
    } catch {
      setError(t("workout.plan_error"));
    } finally {
      setBusy(false);
    }
  };

  const swap = async (fromKey: string, toKey: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiPost<{ plan: WorkoutPlanDTO }>("/api/workout/swap", {
        fromKey,
        toKey,
      });
      setPlan(data.plan);
    } catch {
      setError(t("workout.plan_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="animate-in animate-in--3 mt-8 px-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
          {t("workout.today")}
        </p>
        <h2 className="mt-1 text-base font-bold text-white">
          {t(plan.titleKey as "workout.no_plan")}
        </h2>
        {plan.id ? (
          <p className="mt-1 text-xs text-zinc-400">
            {t(
              plan.status === "deload"
                ? "workout.status.deload"
                : "workout.status.active",
            )}
          </p>
        ) : null}

        {error ? (
          <InlineAlert className="mt-3" variant="error" message={error} />
        ) : null}

        {plan.today.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {plan.today.map((item) => {
              const swaps = item.substitutes;
              return (
                <li
                  key={`${item.exerciseKey}-${item.sortOrder}`}
                  className="rounded-xl bg-white/5 px-3 py-2"
                >
                  <p className="text-sm font-medium text-white">
                    {t(item.exerciseKey as "library.ex.gym.bench_press")}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {item.targetSets}×{item.targetReps}
                    {item.loadKg > 0 ? ` · ${item.loadKg} kg` : ""}
                  </p>
                  {swaps.length > 0 ? (
                    <label className="mt-2 block text-xs text-zinc-400">
                      {t("workout.swap")}
                      <select
                        className="mt-1 w-full rounded-lg bg-zinc-900 px-2 py-1 text-white"
                        disabled={busy}
                        defaultValue=""
                        onChange={(event) => {
                          const next = event.target.value;
                          if (next) void swap(item.exerciseKey, next);
                          event.target.value = "";
                        }}
                      >
                        <option value="">{t("workout.swap")}</option>
                        {swaps.map((key) => (
                          <option key={key} value={key}>
                            {t(key as "library.ex.gym.bench_press")}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">{t("workout.choose_template")}</p>
        )}

        {plan.id ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void mark("rest")}
              className="min-h-11 rounded-full border border-white/15 px-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("workout.rest")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void mark("missed")}
              className="min-h-11 rounded-full border border-white/15 px-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("workout.missed")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void mark("deload")}
              className="min-h-11 rounded-full border border-white/15 px-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("workout.deload")}
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-2">
          {plan.templates.map((template) => (
            <button
              key={template.slug}
              type="button"
              disabled={busy}
              onClick={() => void apply(template.slug)}
              className="min-h-11 rounded-full bg-emerald-500/90 px-4 text-sm font-bold text-zinc-950 disabled:opacity-50"
            >
              {t("workout.apply")}: {t(template.titleKey as "workout.template.gym_full")}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
