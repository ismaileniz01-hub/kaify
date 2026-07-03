"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";

type OverviewResponse = {
  overview: {
    usersTotal: number;
    usersActiveToday: number;
    quotaBlocksToday: number;
    openCostAlerts: number;
    referralsTotal: number;
    costTodayUsd: number;
    costTodayTokens: number;
    degradedMode: boolean;
  };
  degraded: { active: boolean; reason?: string };
  circuits: { name: string; open: boolean; failures: number }[];
  errorCounters: { key: string; count: number }[];
  env: Record<string, boolean>;
};

const LINKS = [
  { href: "/admin/costs", label: "AI Maliyetleri", desc: "Token harcaması, USD tahmini, alarmlar" },
  { href: "/admin/self-heal", label: "Self-Heal", desc: "Circuit breaker, degraded mode, AI teşhis" },
  { href: "/admin/audit", label: "Audit Log", desc: "Yönetici işlem geçmişi" },
] as const;

export default function AdminHubPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [users, setUsers] = useState<
    { id: string; displayName: string; tier: string }[]
  >([]);
  const [coupons, setCoupons] = useState<
    { code: string; influencer_name: string; wallet_balance: number }[]
  >([]);
  const [referrals, setReferrals] = useState<
    { id: string; code: string; referrerId: string; referredId: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    void Promise.all([
      apiGet<OverviewResponse>("/api/admin/overview").catch(() => null),
      apiGet<{ items: { id: string; displayName: string; tier: string }[] }>(
        "/api/admin/users?limit=15",
      ).catch(() => ({ items: [] })),
      apiGet<
        { code: string; influencer_name: string; wallet_balance: number }[]
      >("/api/admin/influencer").catch(() => []),
      apiGet<{
        items: {
          id: string;
          code: string;
          referrerId: string;
          referredId: string;
          createdAt: string;
        }[];
      }>("/api/admin/referrals?limit=10").catch(() => ({ items: [] })),
    ]).then(([overview, userPage, couponList, referralPage]) => {
      if (overview) setData(overview);
      const items = userPage.items ?? [];
      setUsers(items);
      setCoupons(Array.isArray(couponList) ? couponList : []);
      setReferrals(referralPage.items ?? []);
    });
  }, []);

  const o = data?.overview;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kaify Operatör Hub</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Tek ekrandan sistem durumu, maliyet ve yönetim
            </p>
          </div>
          <Link href="/welcome" className="text-sm text-purple-400">
            ← Uygulama
          </Link>
        </header>

        {o && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Kullanıcı", value: o.usersTotal },
              { label: "Bugün aktif", value: o.usersActiveToday },
              {
                label: "AI bugün",
                value: `$${o.costTodayUsd.toFixed(2)}`,
              },
              {
                label: "Token bugün",
                value: o.costTodayTokens.toLocaleString(),
              },
              { label: "Kota blok", value: o.quotaBlocksToday },
              { label: "Maliyet alarm", value: o.openCostAlerts },
              {
                label: "Degraded",
                value: o.degradedMode ? "⚠ Açık" : "OK",
              },
              { label: "Referral", value: o.referralsTotal },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-xs text-zinc-500">{card.label}</p>
                <p className="mt-1 text-lg font-semibold">{card.value}</p>
              </div>
            ))}
          </section>
        )}

        {data && (
          <section className="rounded-xl border border-white/10 p-4 text-sm">
            <p className="mb-2 font-semibold">Altyapı durumu</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.env).map(([k, ok]) => (
                <span
                  key={k}
                  className={ok ? "text-emerald-400" : "text-red-400"}
                >
                  {k}: {ok ? "✓" : "✗"}
                </span>
              ))}
            </div>
            {data.degraded.active && (
              <p className="mt-2 text-amber-400">
                Degraded: {data.degraded.reason ?? "aktif"}
              </p>
            )}
            {data.circuits.some((c) => c.open) && (
              <p className="mt-1 text-red-400">
                Açık circuit:{" "}
                {data.circuits
                  .filter((c) => c.open)
                  .map((c) => c.name)
                  .join(", ")}
              </p>
            )}
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 transition hover:bg-purple-500/10"
            >
              <p className="font-semibold text-purple-200">{link.label}</p>
              <p className="mt-1 text-xs text-zinc-400">{link.desc}</p>
            </Link>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Son kullanıcılar ({users.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {users.slice(0, 10).map((u) => (
              <div
                key={u.id}
                className="flex justify-between border-b border-white/5 px-4 py-2 text-sm"
              >
                <span>{u.displayName || u.id.slice(0, 8)}</span>
                <span className="text-zinc-500">{u.tier}</span>
              </div>
            ))}
          </div>
        </section>

        {coupons.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Influencer kuponları</h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {coupons.slice(0, 8).map((c) => (
                <div
                  key={c.code}
                  className="flex justify-between border-b border-white/5 px-4 py-2 text-sm"
                >
                  <span className="font-mono text-purple-300">{c.code}</span>
                  <span>{c.influencer_name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {referrals.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Son referrallar</h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {referrals.map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between gap-2 border-b border-white/5 px-4 py-2 text-sm last:border-0"
                >
                  <span className="font-mono text-purple-300">{r.code}</span>
                  <span className="truncate text-zinc-500">
                    {r.referrerId.slice(0, 8)} → {r.referredId.slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
