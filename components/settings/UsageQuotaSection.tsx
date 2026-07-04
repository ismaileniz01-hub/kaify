"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import type { UsageStatusDTO } from "@/lib/types/domain.types";

function UsageBar({
  label,
  percent,
  warning,
  warningLabel,
}: {
  label: string;
  percent: number;
  warning?: string | null;
  warningLabel?: string;
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
      {warning && warningLabel && (
        <p className="mt-1 text-[10px] text-amber-400/90">{warningLabel}</p>
      )}
    </div>
  );
}

/** Shows the authenticated user's AI/chat usage quotas. */
export function UsageQuotaSection() {
  const { t } = useLang();
  const [usage, setUsage] = useState<UsageStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGet<UsageStatusDTO>("/api/usage")
      .then(setUsage)
      .catch(() => setUsage(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="animate-in mt-5">
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" aria-hidden />
      </section>
    );
  }

  if (!usage) return null;

  const showUpgrade = usage.tier === "essential";

  return (
    <section className="animate-in mt-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {t("usage.title")}
      </h2>
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs text-zinc-500">
          {t("usage.plan")}:{" "}
          <span className="capitalize text-zinc-300">{usage.tier}</span>
        </p>
        <UsageBar
          label={t("usage.text_tokens")}
          percent={usage.textTokens.percent}
          warning={usage.textTokens.warning}
          warningLabel={
            usage.textTokens.warning === "LIMIT_100"
              ? t("chat.quota.warning_100")
              : usage.textTokens.warning === "LIMIT_80"
                ? t("chat.quota.warning_80")
                : undefined
          }
        />
        <UsageBar
          label={t("usage.maya_photo")}
          percent={usage.mayaPhoto.percent}
          warning={usage.mayaPhoto.warning}
          warningLabel={
            usage.mayaPhoto.warning === "LIMIT_100"
              ? t("chat.quota.warning_100")
              : usage.mayaPhoto.warning === "LIMIT_80"
                ? t("chat.quota.warning_80")
                : undefined
          }
        />
        <UsageBar
          label={t("usage.leo_photo")}
          percent={usage.leoPhoto.percent}
          warning={usage.leoPhoto.warning}
          warningLabel={
            usage.leoPhoto.warning === "LIMIT_100"
              ? t("chat.quota.warning_100")
              : usage.leoPhoto.warning === "LIMIT_80"
                ? t("chat.quota.warning_80")
                : undefined
          }
        />
        {showUpgrade && (
          <div className="border-t border-white/5 pt-3">
            <p className="text-[11px] text-zinc-500">{t("usage.upgrade_hint")}</p>
            <Link
              href="/login"
              className="mt-2 inline-flex text-xs font-semibold text-purple-300 underline-offset-2 hover:underline"
            >
              {t("usage.upgrade")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
