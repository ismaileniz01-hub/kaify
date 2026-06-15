"use client";

import { useState, useRef } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

export function WaitlistForm({ className = "" }: { className?: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!firstName.trim() || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }

    // Execute reCAPTCHA (if configured)
    const token = await recaptchaRef.current?.executeAsync();
    if (!token && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      // Submit to our own server-side API route (no CORS, no API key exposure)
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          recaptchaToken: token,
          honeypot: "", // Honeypot alanı — botlar doldurur, gerçek kullanıcılar boş bırakır
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setFirstName("");
        setLastName("");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      // Network failure
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={`flex flex-col items-center gap-3 py-6 ${className}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-7 w-7 text-emerald-400" />
        </div>
        <p className="text-lg font-semibold text-white">You're on the list! 🎉</p>
        <p className="text-sm text-zinc-400">
          Thanks{firstName ? ` ${firstName}` : ""}, we'll keep you posted.
        </p>
        <p className="mt-1 text-xs text-amber-400/80">
          💡 If our email lands in Promotions/Spam, move it to Primary to stay in the loop!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
      {/* Honeypot — CSS ile gizli, sadece botlar görür */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="honeypot">Leave this empty</label>
        <input
          id="honeypot"
          type="text"
          name="honeypot"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-purple-500/50 focus:bg-white/10"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-purple-500/50 focus:bg-white/10"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-purple-500/50 focus:bg-white/10"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Join <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          size="invisible"
        />
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
