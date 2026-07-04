"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { UsageStatusDTO } from "@/lib/types/domain.types";

function UsageBar({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-purple-500";

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-300">%{pct}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Shows the authenticated user's AI/chat usage quotas. */
export function UsageQuotaSection() {
  const [usage, setUsage] = useState<UsageStatusDTO | null>(null);

  useEffect(() => {
    void apiGet<UsageStatusDTO>("/api/usage")
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  if (!usage) return null;

  return (
    <section className="animate-in mt-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        Kullanım limitleri
      </h2>
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs text-zinc-500">
          Plan: <span className="capitalize text-zinc-300">{usage.tier}</span>
        </p>
        <UsageBar
          label="Metin token (aylık)"
          percent={usage.textTokens.percent}
        />
        <UsageBar
          label="Maya foto (günlük)"
          percent={usage.mayaPhoto.percent}
        />
        <UsageBar
          label="Leo foto (haftalık)"
          percent={usage.leoPhoto.percent}
        />
      </div>
    </section>
  );
}
