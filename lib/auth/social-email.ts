"use client";

import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

export type SocialProvider = "google" | "apple";

const MESSAGE_TYPE = "kaify-social-email";

export class SocialEmailError extends Error {
  constructor(readonly code: "cancelled" | "unavailable" | "no_email" | "failed") {
    super(code);
  }
}

/** Open Google or Apple and return the account email. Does not keep a session. */
export function requestProviderEmail(provider: SocialProvider): Promise<string> {
  const supabase = tryCreateBrowserSupabaseClient();
  if (!supabase || typeof window === "undefined") {
    return Promise.reject(new SocialEmailError("unavailable"));
  }

  const redirectTo = `${window.location.origin}/auth/social-complete`;

  return new Promise((resolve, reject) => {
    let popup: Window | null = null;
    let settled = false;

    const finish = (error: SocialEmailError | null, email?: string) => {
      if (settled) return;
      settled = true;
      window.clearInterval(watch);
      window.removeEventListener("message", onMessage);
      if (error) reject(error);
      else if (email) resolve(email);
      else reject(new SocialEmailError("no_email"));
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; email?: string } | null;
      if (!data || data.type !== MESSAGE_TYPE) return;
      const email = data.email?.trim().toLowerCase() ?? "";
      if (!email.includes("@")) {
        finish(new SocialEmailError("no_email"));
        return;
      }
      finish(null, email);
    };

    const watch = window.setInterval(() => {
      if (popup && popup.closed) finish(new SocialEmailError("cancelled"));
    }, 400);

    window.addEventListener("message", onMessage);

    void supabase.auth
      .signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams:
            provider === "google" ? { prompt: "select_account" } : undefined,
        },
      })
      .then(({ data, error }) => {
        if (error || !data.url) {
          finish(new SocialEmailError("failed"));
          return;
        }
        popup = window.open(
          data.url,
          "kaify-social",
          "popup,width=480,height=720",
        );
        if (!popup) finish(new SocialEmailError("failed"));
      })
      .catch(() => finish(new SocialEmailError("failed")));
  });
}

export const SOCIAL_EMAIL_MESSAGE = MESSAGE_TYPE;
