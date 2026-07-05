"use client";

import Link from "next/link";
import { ArrowLeft, Shield, ShieldCheck, ShieldOff, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  enrollTotp,
  listVerifiedTotpFactors,
  unenrollTotp,
  verifyTotpEnrollment,
} from "@/lib/auth/mfa";
import { CSRF_HEADER_NAME, readCsrfCookieFromDocument } from "@/lib/security/csrf-client";
import { apiDelete, apiGet } from "@/lib/api/client";
import { CONSENT_TYPES } from "@/lib/legal/constants";

type PendingEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export default function SecuritySettingsPage() {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiConsentActive, setAiConsentActive] = useState(false);
  const [pushConsentActive, setPushConsentActive] = useState(false);

  const refresh = async () => {
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) return;
    const factors = await listVerifiedTotpFactors(supabase);
    setEnabled(factors.length > 0);
    setFactorId(factors[0]?.id ?? null);
  };

  useEffect(() => {
    void refresh();
    void apiGet<{ aiHealth: boolean; pushNotifications: boolean }>("/api/consent")
      .then((status) => {
        setAiConsentActive(status.aiHealth);
        setPushConsentActive(status.pushNotifications);
      })
      .catch(() => {
        setAiConsentActive(false);
        setPushConsentActive(false);
      });
  }, []);

  const startEnroll = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) {
        setError(t("login.error.failed"));
        return;
      }

      const { data, error: enrollError } = await enrollTotp(supabase);
      if (enrollError || !data?.totp || !data.id) {
        setError(enrollError?.message ?? t("mfa.error.enroll"));
        return;
      }

      setPending({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch {
      setError(t("login.error.failed"));
    } finally {
      setLoading(false);
    }
  };

  const confirmEnroll = async () => {
    if (!pending || code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) {
        setError(t("login.error.failed"));
        return;
      }

      const { error: verifyError } = await verifyTotpEnrollment(
        supabase,
        pending.factorId,
        code,
      );
      if (verifyError) {
        setError(t("mfa.error.invalid"));
        return;
      }

      setPending(null);
      setCode("");
      setMessage(t("mfa.enroll.success"));
      await refresh();
    } catch {
      setError(t("login.error.failed"));
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!factorId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;

      const { error: unenrollError } = await unenrollTotp(supabase, factorId);
      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }

      setMessage(t("mfa.disable.success"));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const revokeOtherSessions = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;
      const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
      setMessage("Diğer cihazlardaki oturumlar sonlandırıldı.");
    } finally {
      setLoading(false);
    }
  };

  const revokeAllSessions = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) return;
      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const csrf = readCsrfCookieFromDocument();
      const res = await fetch("/api/profile/export", {
        credentials: "include",
        headers: csrf ? { [CSRF_HEADER_NAME]: csrf } : {},
      });
      if (!res.ok) {
        setError(t("login.error.failed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "kaify-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Veri dışa aktarıldı.");
    } catch {
      setError(t("login.error.failed"));
    } finally {
      setLoading(false);
    }
  };

  const revokeAiConsent = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiDelete("/api/consent", {
        consentType: CONSENT_TYPES.AI_HEALTH,
      });
      setAiConsentActive(false);
      setMessage(t("consent.revoke.success"));
    } catch {
      setError(t("consent.revoke.error"));
    } finally {
      setLoading(false);
    }
  };

  const revokePushConsent = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiDelete("/api/consent", {
        consentType: CONSENT_TYPES.PUSH_NOTIFICATIONS,
      });
      setPushConsentActive(false);
      setMessage(t("consent.revoke.push.success"));
    } catch {
      setError(t("consent.revoke.error"));
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiDelete<{ deleted: boolean }>("/api/profile", { confirm: "DELETE" });
      window.location.href = "/login";
    } catch {
      setError(t("settings.delete.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/settings" className="rounded-full p-2 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{t("mfa.settings.title")}</h1>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start gap-3">
            {enabled ? (
              <ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-400" />
            ) : (
              <Shield className="mt-0.5 h-6 w-6 text-zinc-400" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{t("mfa.settings.status")}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {enabled ? t("mfa.settings.enabled") : t("mfa.settings.disabled")}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                {t("mfa.settings.desc")}
              </p>
            </div>
          </div>

          {!enabled && !pending && (
            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {t("mfa.enroll.start")}
            </button>
          )}

          {enabled && factorId && (
            <button
              type="button"
              onClick={() => void disableMfa()}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 py-3 text-sm text-red-300 disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4" />
              {t("mfa.disable.action")}
            </button>
          )}
        </section>

        {pending && (
          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-300">{t("mfa.enroll.scan")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pending.qrCode}
              alt="TOTP QR"
              className="mx-auto h-48 w-48 rounded-xl bg-white p-2"
            />
            <p className="break-all text-center font-mono text-xs text-zinc-400">
              {pending.secret}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center text-lg tracking-widest"
            />
            <button
              type="button"
              onClick={() => void confirmEnroll()}
              disabled={loading || code.length < 6}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              {t("mfa.enroll.confirm")}
            </button>
          </section>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold">Oturum yönetimi</p>
          <p className="mt-1 text-sm text-zinc-400">
            Kayıp cihaz veya şüpheli erişim durumunda diğer oturumları kapatın.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void revokeOtherSessions()}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium disabled:opacity-50"
            >
              Diğer cihazlardaki oturumları kapat
            </button>
            <button
              type="button"
              onClick={() => void revokeAllSessions()}
              disabled={loading}
              className="w-full rounded-xl border border-red-500/30 py-3 text-sm text-red-300 disabled:opacity-50"
            >
              Tüm oturumları kapat (çıkış yap)
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold">{t("consent.revoke.title")}</p>
          <p className="mt-1 text-sm text-zinc-400">{t("consent.revoke.desc")}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {aiConsentActive ? t("consent.revoke.active") : t("consent.revoke.inactive")}
          </p>
          <button
            type="button"
            onClick={() => void revokeAiConsent()}
            disabled={loading || !aiConsentActive}
            className="mt-4 w-full rounded-xl border border-amber-500/30 py-3 text-sm text-amber-200 disabled:opacity-40"
          >
            {t("consent.revoke.action")}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold">{t("consent.revoke.push.title")}</p>
          <p className="mt-1 text-sm text-zinc-400">{t("consent.revoke.push.desc")}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {pushConsentActive
              ? t("consent.revoke.push.active")
              : t("consent.revoke.push.inactive")}
          </p>
          <button
            type="button"
            onClick={() => void revokePushConsent()}
            disabled={loading || !pushConsentActive}
            className="mt-4 w-full rounded-xl border border-amber-500/30 py-3 text-sm text-amber-200 disabled:opacity-40"
          >
            {t("consent.revoke.push.action")}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start gap-3">
            <Download className="mt-0.5 h-6 w-6 text-zinc-400" />
            <div className="flex-1">
              <p className="font-semibold">Veri dışa aktarma</p>
              <p className="mt-1 text-sm text-zinc-400">
                KVKK/GDPR kapsamında hesabınızdaki tüm verileri JSON olarak indirin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void exportData()}
            disabled={loading}
            className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm font-medium disabled:opacity-50"
          >
            JSON indir
          </button>
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="font-semibold text-red-200">{t("settings.delete.title")}</p>
          <p className="mt-1 text-sm text-zinc-400">{t("settings.delete.desc")}</p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="mt-4 w-full rounded-xl border border-red-500/40 py-3 text-sm font-medium text-red-300 disabled:opacity-50"
            >
              {t("settings.delete.start")}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-red-500/30 bg-black/30 px-4 py-3 text-center font-mono text-sm tracking-widest"
              />
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={loading || deleteConfirm !== "DELETE"}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {t("settings.delete.confirm")}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
