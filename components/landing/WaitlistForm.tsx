"use client";

import { useState, useRef } from "react";
import { ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export function WaitlistForm({ className = "" }: { className?: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (firstName.trim().length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    }

    if (lastName.trim() && lastName.trim().length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validate()) {
      setStatus("error");
      // Focus the first error for screen readers
      errorRef.current?.focus();
      return;
    }

    // Execute reCAPTCHA (if configured — skip if no site key set)
    const token = await recaptchaRef.current?.executeAsync();
    if (!token && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY.includes("YOUR_")) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
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
          honeypot: "",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setFirstName("");
        setLastName("");
        setEmail("");
        setFieldErrors({});
      } else {
        setStatus("error");
      }
    } catch {
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

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`} noValidate>
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

      {/* Live error region for screen readers */}
      <div
        ref={errorRef}
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-red-900 focus:text-white focus:rounded"
      >
        {hasErrors && `Form errors: ${Object.values(fieldErrors).join(". ")}`}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
            }}
            aria-label="First Name"
            aria-required="true"
            aria-invalid={!!fieldErrors.firstName}
            aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
            className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:bg-white/10 ${
              fieldErrors.firstName
                ? "border-red-500/60 focus:border-red-500"
                : "border-white/10 focus:border-purple-500/50"
            } bg-white/5`}
          />
          {fieldErrors.firstName && (
            <p id="firstName-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.firstName}
            </p>
          )}
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
            }}
            aria-label="Last Name"
            aria-invalid={!!fieldErrors.lastName}
            aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
            className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:bg-white/10 ${
              fieldErrors.lastName
                ? "border-red-500/60 focus:border-red-500"
                : "border-white/10 focus:border-purple-500/50"
            } bg-white/5`}
          />
          {fieldErrors.lastName && (
            <p id="lastName-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.lastName}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-label="Email address"
            aria-required="true"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={`min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:bg-white/10 ${
              fieldErrors.email
                ? "border-red-500/60 focus:border-red-500"
                : "border-white/10 focus:border-purple-500/50"
            } bg-white/5`}
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-2 disabled:opacity-60 active:scale-[0.97]"
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

      {status === "error" && !hasErrors && (
        <div className="flex items-center gap-2 text-xs text-red-400" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Something went wrong. Please try again.</span>
        </div>
      )}
    </form>
  );
}
