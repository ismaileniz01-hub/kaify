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
    // Open during the tap. Mobile browsers block a popup opened after the network call.
    const popup: Window | null = window.open(
      "about:blank",
      "kaify-social",
      "popup,width=480,height=720",
    );
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
      if (!popup) return;
      try {
        if (popup.closed) finish(new SocialEmailError("cancelled"));
      } catch {
        // The provider page is cross-origin. Wait for the return message.
      }
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
          popup?.close();
          const message = error?.message ?? "";
          finish(
            new SocialEmailError(
              /not enabled|unsupported provider/i.test(message) ? "unavailable" : "failed",
            ),
          );
          return;
        }
        const blocked = !popup || popup.closed;
        if (blocked) {
          try {
            sessionStorage.setItem("kaify_social_pending", "1");
          } catch {
            // Same-tab return still works if storage is available on the way back.
          }
          window.location.assign(data.url);
          return;
        }
        popup.location.replace(data.url);
      })
      .catch(() => {
        popup?.close();
        finish(new SocialEmailError("failed"));
      });
  });
}

export const SOCIAL_EMAIL_MESSAGE = MESSAGE_TYPE;
