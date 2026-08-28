"use client";

import { useEffect, useState } from "react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Capacitor hands off here after local OTP. Hash tokens never hit the server.
 * Origin is kaifyai.org so GoTrue CORS works (unlike capacitor://).
 */
export default function NativeEntryPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(raw);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    window.history.replaceState(null, "", window.location.pathname);

    if (!accessToken || !refreshToken) {
      setError("Oturum bilgisi eksik. Tekrar giriş yap.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    void supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message || "Oturum açılamadı.");
          return;
        }
        window.location.replace("/welcome");
      })
      .catch(() => {
        setError("Bağlantı hatası. Tekrar giriş yap.");
      });
  }, []);

  return (
    <div className="phone-shell login-page relative flex min-h-dvh flex-col">
      <FitnessWallpaper />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {error ? (
          <>
            <p className="text-sm text-red-200" role="alert">
              {error}
            </p>
            <a
              className="mt-4 text-sm font-semibold text-purple-300 underline"
              href="/login"
            >
              Girişe dön
            </a>
          </>
        ) : (
          <p className="text-sm text-zinc-300">Kaify açılıyor…</p>
        )}
      </main>
    </div>
  );
}
