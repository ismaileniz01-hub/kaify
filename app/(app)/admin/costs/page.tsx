"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/i18n/format";
import type {
  CacheHitStatsDTO,
  CostAlertRow,
  CostByUserRow,
  CostSummaryDTO,
  QuotaEventRow,
} from "@/lib/services/cost-admin.service";

type CostsResponse = {
  summary: CostSummaryDTO;
  byUser: CostByUserRow[];
  quotaEvents: QuotaEventRow[];
  alerts: CostAlertRow[];
  cacheStats: CacheHitStatsDTO;
};

export default function AdminCostsPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<CostsResponse | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const load = async (d = days) => {
    setLoading(true);
    try {
      const res = await apiGet<CostsResponse>(`/api/admin/costs?days=${d}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when period changes
  }, [days]);

  const ackAlert = async (alertId: string) => {
    await apiPatch("/api/admin/costs", { alertId });
    await load();
  };

  const s = data?.summary;
  const usd = (value: number) => formatCurrency(value, lang, "USD");

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("admin.costs.title")}</h1>
            <p className="text-sm text-zinc-500">{t("admin.costs.subtitle")}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-purple-400">
              {t("admin.costs.back_hub")}
            </Link>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1"
            >
              <option value={1}>{t("admin.costs.days_1")}</option>
              <option value={7}>{t("admin.costs.days_7")}</option>
              <option value={30}>{t("admin.costs.days_30")}</option>
            </select>
          </div>
        </header>

        {loading && !data && (
          <p className="text-zinc-500">{t("common.loading")}</p>
        )}

        {s && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label={t("admin.costs.stat.today_usd")}
                value={usd(s.today.estimated_usd)}
              />
              <Stat
                label={t("admin.costs.stat.today_tokens")}
                value={formatNumber(s.today.total_tokens, lang)}
              />
              <Stat
                label={t("admin.costs.stat.period_usd", { days })}
                value={usd(s.period.estimated_usd)}
              />
              <Stat
                label={t("admin.costs.stat.period_calls", { days })}
                value={formatNumber(s.period.calls, lang)}
              />
            </section>

            {data?.cacheStats && data.cacheStats.calls_with_cache > 0 && (
              <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                <h2 className="mb-2 font-semibold text-emerald-200">
                  {t("admin.costs.cache.title")}
                </h2>
                <p className="text-zinc-300">
                  {t("admin.costs.cache.body", {
                    days,
                    percent: data.cacheStats.cache_ratio_percent,
                    hit: formatNumber(data.cacheStats.cache_hit_tokens, lang),
                    prompt: formatNumber(data.cacheStats.prompt_tokens, lang),
                    calls: formatNumber(data.cacheStats.calls_with_cache, lang),
                  })}
                </p>
              </section>
            )}

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">
                {t("admin.costs.by_provider")}
              </h2>
              <div className="space-y-2 text-sm">
                {s.by_provider.length === 0 ? (
                  <p className="text-zinc-500">
                    {t("admin.costs.by_provider.empty")}
                  </p>
                ) : (
                  s.by_provider.map((p) => (
                    <div key={p.provider} className="flex justify-between">
                      <span className="capitalize">{p.provider}</span>
                      <span>
                        {t("admin.costs.provider_line", {
                          usd: usd(p.estimated_usd),
                          tokens: formatNumber(p.total_tokens, lang),
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">
                {t("admin.costs.daily_trend")}
              </h2>
              <div className="space-y-2 text-sm">
                {(s.daily ?? []).map((d) => (
                  <div key={d.date} className="flex justify-between">
                    <span>{d.date}</span>
                    <span>
                      {t("admin.costs.daily_line", {
                        usd: usd(d.estimated_usd),
                        tokens: formatNumber(d.total_tokens, lang),
                        calls: formatNumber(d.calls, lang),
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">
                {t("admin.costs.by_operation")}
              </h2>
              <div className="space-y-2 text-sm">
                {s.by_operation.map((op) => (
                  <div key={op.operation} className="flex justify-between">
                    <span>{op.operation}</span>
                    <span>
                      {t("admin.costs.operation_line", {
                        usd: usd(op.estimated_usd),
                        calls: formatNumber(op.calls, lang),
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">
                {t("admin.costs.top_users")}
              </h2>
              <div className="space-y-2 text-sm">
                {(data?.byUser ?? []).map((u) => (
                  <div key={u.user_id} className="flex justify-between gap-2">
                    <span>
                      {u.display_name}{" "}
                      <span className="text-zinc-500">({u.tier})</span>
                    </span>
                    <span>
                      {t("admin.costs.user_line", {
                        usd: usd(u.estimated_usd),
                        tokens: formatNumber(u.total_tokens, lang),
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h2 className="mb-3 font-semibold text-amber-200">
                {t("admin.costs.alerts")}
              </h2>
              {(data?.alerts ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {t("admin.costs.alerts.empty")}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data?.alerts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-2"
                    >
                      <div>
                        <span
                          className={
                            a.severity === "critical"
                              ? "text-red-400"
                              : a.severity === "warn"
                                ? "text-amber-400"
                                : "text-zinc-400"
                          }
                        >
                          [{a.alert_type}]
                        </span>{" "}
                        {a.message}
                        {!a.acknowledged && (
                          <button
                            type="button"
                            onClick={() => void ackAlert(a.id)}
                            className="ml-2 text-xs text-purple-400 underline"
                          >
                            {t("admin.costs.alerts.ack")}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">
                {t("admin.costs.quota_events")}
              </h2>
              <div className="max-h-64 space-y-1 overflow-y-auto text-xs">
                {(data?.quotaEvents ?? []).map((e) => (
                  <div key={e.id} className="flex justify-between gap-2">
                    <span>
                      {e.display_name} · {e.resource} · {e.event_type}
                    </span>
                    <span className="text-zinc-500">
                      {formatDateTime(e.created_at, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
