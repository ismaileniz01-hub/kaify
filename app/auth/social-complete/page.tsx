"use client";

import { useEffect, useState } from "react";
import { SOCIAL_EMAIL_MESSAGE } from "@/lib/auth/social-email";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * OAuth return page. Reads the provider email, drops the session, and either
 * tells the signup popup or returns the installed app to the code step.
 */
export default function SocialCompletePage() {
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Sign-in is unavailable.");
      return;
    }

    let done = false;
    const deliver = async (email: string) => {
      if (done) return;
      done = true;
      const normalized = email.trim().toLowerCase();
      await supabase.auth.signOut().catch(() => undefined);
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: SOCIAL_EMAIL_MESSAGE, email: normalized },
          window.location.origin,
        );
        window.close();
        return;
      }
      try {
        sessionStorage.setItem("kaify_social_email", normalized);
        sessionStorage.removeItem("kaify_social_pending");
      } catch {
        // The signup page can still ask for the email if storage is blocked.
      }
      window.location.replace("/signup");
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const email = session?.user.email;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && email) {
        void deliver(email);
      }
    });

    const timer = window.setTimeout(() => {
      if (!done) setMessage("We could not read an email from that account.");
    }, 12000);

    return () => {
      subscription.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-6 text-center text-sm text-zinc-300">
      <p>{message}</p>
    </main>
  );
}
