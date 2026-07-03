"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { AdminAuditRow } from "@/lib/services/audit.service";

export default function AdminAuditPage() {
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
            <h1 className="text-2xl font-bold">Admin Audit Log</h1>
            <p className="text-sm text-zinc-500">
              Kim, ne zaman, hangi yönetici işlemini yaptı
            </p>
          </div>
          <Link href="/admin" className="text-sm text-purple-400">
            ← Hub
          </Link>
        </header>

        {loading && <p className="text-zinc-500">Yükleniyor…</p>}

        <div className="overflow-hidden rounded-xl border border-white/10">
          {items.length === 0 && !loading ? (
            <p className="p-4 text-sm text-zinc-500">Kayıt yok.</p>
          ) : (
            items.map((row) => (
              <div
                key={row.id}
                className="border-b border-white/5 px-4 py-3 text-sm last:border-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-purple-300">{row.action}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(row.createdAt).toLocaleString("tr-TR")}
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
