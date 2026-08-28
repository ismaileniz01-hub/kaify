"use client";

import { useEffect, useState } from "react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";

/**
 * Capacitor hands off here after local OTP. Hash tokens never hit the server.
 * Cookies are set via POST so /welcome is not bounced back to /login.
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
      setError("Oturum bilgisi eksik. Uygulamayı kapatıp tekrar aç.");
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/auth/session/establish", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken }),
        });
        if (!response.ok) {
          setError("Oturum kaydedilemedi. Uygulamayı kapatıp tekrar aç.");
          return;
        }
        window.location.replace("/welcome");
      } catch {
        setError("Bağlantı hatası. Uygulamayı kapatıp tekrar aç.");
      }
    })();
  }, []);

  return (
    <div className="phone-shell login-page relative flex min-h-dvh flex-col">
      <FitnessWallpaper />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {error ? (
          <p className="text-sm text-red-200" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-zinc-300">Kaify açılıyor…</p>
        )}
      </main>
    </div>
  );
}
