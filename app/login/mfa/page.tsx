"use client";

import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { useLang } from "@/lib/lang-context";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  getMfaAssurance,
  listVerifiedTotpFactors,
  verifyTotpLogin,
} from "@/lib/auth/mfa";

export default function MfaVerifyPage() {
  const { t } = useLang();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const assurance = await getMfaAssurance(supabase);
      if (!assurance.verificationRequired) {
        router.replace("/welcome");
        return;
      }

      const factors = await listVerifiedTotpFactors(supabase);
      if (factors.length === 0) {
        router.replace("/welcome");
        return;
      }

      setFactorId(factors[0].id);
      setBooting(false);
    })();
  }, [router]);

  const handleVerify = async () => {
    if (!factorId || code.trim().length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = tryCreateBrowserSupabaseClient();
      if (!supabase) {
        setError(t("login.error.failed"));
        return;
      }

      const { error: verifyError } = await verifyTotpLogin(
        supabase,
        factorId,
        code.trim(),
      );
      if (verifyError) {
        setError(t("mfa.error.invalid"));
        return;
      }

      router.replace("/welcome");
    } catch {
      setError(t("login.error.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <div className="phone-shell flex items-center justify-center bg-zinc-950 text-zinc-400">
        …
      </div>
    );
  }

  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-between px-8 pb-16 pt-16">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <Shield className="h-10 w-10 text-emerald-300" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">{t("mfa.verify.title")}</h1>
            <p className="mt-2 max-w-xs text-sm text-zinc-300">{t("mfa.verify.subtitle")}</p>
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-center text-2xl tracking-[0.4em] text-white placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={loading || code.length < 6}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {loading ? t("mfa.verify.loading") : t("mfa.verify.submit")}
            <ArrowRight className="h-5 w-5" />
          </button>

          {error && <p className="text-center text-xs text-red-300">{error}</p>}

          <Link
            href="/login"
            className="text-center text-xs text-purple-200/70 underline"
            onClick={() => {
              void tryCreateBrowserSupabaseClient()?.auth.signOut();
            }}
          >
            {t("mfa.verify.logout")}
          </Link>
        </div>
      </main>
    </div>
  );
}
