"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { formatDateTime } from "@/lib/i18n/format";
import type { AdminAuditRow } from "@/lib/services/audit.service";

export default function AdminAuditPage() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<AdminAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGet<{ items: AdminAuditRow[] }>("/api/admin/audit?limit=100")
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("admin.audit.title")}</h1>
            <p className="text-sm text-zinc-500">{t("admin.audit.subtitle")}</p>
          </div>
          <Link href="/admin" className="text-sm text-purple-400">
            {t("admin.costs.back_hub")}
          </Link>
        </header>

        {loading && <p className="text-zinc-500">{t("common.loading")}</p>}

        <div className="overflow-hidden rounded-xl border border-white/10">
          {items.length === 0 && !loading ? (
            <p className="p-4 text-sm text-zinc-500">{t("admin.audit.empty")}</p>
          ) : (
            items.map((row) => (
              <div
                key={row.id}
                className="border-b border-white/5 px-4 py-3 text-sm last:border-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-purple-300">{row.action}</span>
                  <span className="text-xs text-zinc-500">
                    {formatDateTime(row.createdAt, lang)}
                  </span>
                </div>
                <p className="mt-1 text-zinc-400">
                  {row.adminName}
                  {row.targetType && (
                    <>
                      {" "}
                      → {row.targetType}
                      {row.targetId ? `:${row.targetId.slice(0, 8)}` : ""}
                    </>
                  )}
                  {row.ip && <span className="text-zinc-600"> · {row.ip}</span>}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
