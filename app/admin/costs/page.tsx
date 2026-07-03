"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api/client";
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

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">AI Maliyet Paneli</h1>
            <p className="text-sm text-zinc-500">
              Token harcaması + tahmini USD (env fiyatlandırması)
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-purple-400">
              ← Hub
            </Link>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1"
            >
              <option value={1}>1 gün</option>
              <option value={7}>7 gün</option>
              <option value={30}>30 gün</option>
            </select>
          </div>
        </header>

        {loading && !data && <p className="text-zinc-500">Yükleniyor…</p>}

        {s && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Bugün USD"
                value={`$${s.today.estimated_usd.toFixed(4)}`}
              />
              <Stat
                label="Bugün token"
                value={s.today.total_tokens.toLocaleString()}
              />
              <Stat
                label={`${days}g USD`}
                value={`$${s.period.estimated_usd.toFixed(4)}`}
              />
              <Stat
                label={`${days}g çağrı`}
                value={s.period.calls.toLocaleString()}
              />
            </section>

            {data?.cacheStats && data.cacheStats.calls_with_cache > 0 && (
              <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                <h2 className="mb-2 font-semibold text-emerald-200">
                  Prefix önbellek (DeepSeek)
                </h2>
                <p className="text-zinc-300">
                  Son {days} günde{" "}
                  <span className="font-semibold text-white">
                    %{data.cacheStats.cache_ratio_percent}
                  </span>{" "}
                  girdi token önbellekten geldi (
                  {data.cacheStats.cache_hit_tokens.toLocaleString()} /{" "}
                  {data.cacheStats.prompt_tokens.toLocaleString()} prompt tok ·{" "}
                  {data.cacheStats.calls_with_cache} çağrı). Yüksek oran =
                  düşük gerçek fatura.
                </p>
              </section>
            )}

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">Sağlayıcıya göre</h2>
              <div className="space-y-2 text-sm">
                {s.by_provider.length === 0 ? (
                  <p className="text-zinc-500">
                    Henüz kayıt yok — migration uygulandıktan sonra yeni AI
                    çağrıları burada görünür.
                  </p>
                ) : (
                  s.by_provider.map((p) => (
                    <div key={p.provider} className="flex justify-between">
                      <span className="capitalize">{p.provider}</span>
                      <span>
                        ${p.estimated_usd.toFixed(4)} ·{" "}
                        {p.total_tokens.toLocaleString()} tok
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">Günlük trend</h2>
              <div className="space-y-2 text-sm">
                {(s.daily ?? []).map((d) => (
                  <div key={d.date} className="flex justify-between">
                    <span>{d.date}</span>
                    <span>
                      ${d.estimated_usd.toFixed(4)} ·{" "}
                      {d.total_tokens.toLocaleString()} tok · {d.calls} çağrı
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">Operasyona göre</h2>
              <div className="space-y-2 text-sm">
                {s.by_operation.map((op) => (
                  <div key={op.operation} className="flex justify-between">
                    <span>{op.operation}</span>
                    <span>
                      ${op.estimated_usd.toFixed(4)} · {op.calls} çağrı
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">En çok harcayan kullanıcılar</h2>
              <div className="space-y-2 text-sm">
                {(data?.byUser ?? []).map((u) => (
                  <div key={u.user_id} className="flex justify-between gap-2">
                    <span>
                      {u.display_name}{" "}
                      <span className="text-zinc-500">({u.tier})</span>
                    </span>
                    <span>
                      ${u.estimated_usd.toFixed(4)} ·{" "}
                      {u.total_tokens.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h2 className="mb-3 font-semibold text-amber-200">
                Maliyet alarmları
              </h2>
              {(data?.alerts ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">Açık alarm yok.</p>
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
                            Kapat
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-3 font-semibold">Kota olayları (usage_events)</h2>
              <div className="max-h-64 space-y-1 overflow-y-auto text-xs">
                {(data?.quotaEvents ?? []).map((e) => (
                  <div key={e.id} className="flex justify-between gap-2">
                    <span>
                      {e.display_name} · {e.resource} · {e.event_type}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(e.created_at).toLocaleString("tr-TR")}
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
