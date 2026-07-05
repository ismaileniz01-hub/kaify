"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { useLang } from "@/lib/lang-context";
import { captureReferralFromUrl } from "@/lib/referral";
import {
  PENDING_LEGAL_CONSENT_KEY,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  const handleMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem(
        PENDING_LEGAL_CONSENT_KEY,
        JSON.stringify({
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          acceptedAt: new Date().toISOString(),
        }),
      );

      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) {
        setError(t("login.error.failed"));
        return;
      }
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/welcome`;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      setSent(true);
    } catch {
      setError(t("login.error.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-between px-8 pb-20 pt-16">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-2">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute h-52 w-52 rounded-full bg-purple-500/25 blur-3xl"
              aria-hidden
            />
            <Image
              src="/kaify-logo.png"
              alt="K.AIFY"
              width={220}
              height={220}
              className="relative h-48 w-48 object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-6xl font-bold leading-none tracking-[0.08em] text-white">
              {t("login.title")}
            </h1>
            <p className="max-w-[280px] text-base font-medium leading-snug tracking-wide text-purple-100/90">
              {t("login.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-4">
          {sent ? (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
              E-postana giriş bağlantısı gönderildi. Linke tıklayarak devam et.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3">
                <Mail className="h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-posta adresin"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleMagicLink()}
                disabled={loading || !email.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-semibold text-zinc-900 shadow-xl disabled:opacity-50"
              >
                {loading ? "Gönderiliyor…" : "Magic Link ile Giriş"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </>
          )}

          {error && (
            <p className="text-center text-xs text-red-300">{error}</p>
          )}

          <Link
            href="/welcome"
            className="flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/15"
          >
            {t("login.preview")}
          </Link>
        </div>
      </main>
    </div>
  );
}
