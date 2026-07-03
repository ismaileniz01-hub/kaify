"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { SelfHealSnapshot } from "@/lib/resilience/self-heal-report";

export default function AdminSelfHealPage() {
  const [snapshot, setSnapshot] = useState<SelfHealSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (withAi = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<SelfHealSnapshot>(
        `/api/admin/self-heal${withAi ? "?ai=1" : ""}`,
      );
      setSnapshot(data);
    } catch {
      setError("Self-heal verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const recover = async () => {
    setRecovering(true);
    try {
      await apiPost("/api/admin/self-heal", {});
      await load(false);
    } catch {
      setError("Kurtarma komutu başarısız.");
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Self-Heal Monitor</h1>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-purple-400">
              ← Admin
            </Link>
            <Link href="/welcome" className="text-zinc-500">
              Uygulama
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Yenile (+ AI rapor)
          </button>
          <button
            type="button"
            onClick={() => void recover()}
            disabled={recovering}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {recovering ? "Kurtarılıyor…" : "Degraded + circuit sıfırla"}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading && !snapshot && <p className="text-zinc-500">Yükleniyor…</p>}

        {snapshot && (
          <>
            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-2 font-semibold">Durum</h2>
              <p className="text-sm text-zinc-400">
                Zaman: {snapshot.timestamp}
              </p>
              <p className="mt-2 text-sm">
                Degraded mode:{" "}
                <span
                  className={
                    snapshot.degraded.active ? "text-amber-400" : "text-emerald-400"
                  }
                >
                  {snapshot.degraded.active ? "AKTİF" : "kapalı"}
                </span>
              </p>
              {snapshot.degraded.reason && (
                <p className="mt-1 text-xs text-zinc-500">{snapshot.degraded.reason}</p>
              )}
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-2 font-semibold">Circuit breakers</h2>
              {snapshot.circuits.length === 0 ? (
                <p className="text-sm text-zinc-500">Henüz tetiklenmedi.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {snapshot.circuits.map((c) => (
                    <li key={c.name} className="flex justify-between">
                      <span>{c.name}</span>
                      <span className={c.open ? "text-red-400" : "text-zinc-400"}>
                        {c.open ? "OPEN" : "closed"} ({c.failures} fail)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-2 font-semibold">Hata sayaçları (5 dk)</h2>
              {snapshot.errorCounters.length === 0 ? (
                <p className="text-sm text-zinc-500">5xx spike yok.</p>
              ) : (
                <ul className="text-sm">
                  {snapshot.errorCounters.map((e) => (
                    <li key={e.key}>
                      {e.key}: {e.count}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {snapshot.aiReport && (
              <section className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                <h2 className="mb-2 font-semibold text-purple-200">
                  AI kök-neden raporu (öneri — otomatik uygulanmaz)
                </h2>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {snapshot.aiReport}
                </pre>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
