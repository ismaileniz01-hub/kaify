"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { signOutUser } from "@/lib/auth/logout";
import { useLang } from "@/lib/lang-context";
import { useSessionOptional } from "@/lib/session-contexts";
import type { ProfileDTO } from "@/lib/types/domain.types";
import type { SubscriptionTier } from "@/lib/types/database.types";

export type AccountSnapshot = {
  displayName: string;
  avatarUrl: string | null;
  tier: SubscriptionTier | null;
  tierStartedAt: string | null;
};

export function useAccountSnapshot(isAuthenticated: boolean): AccountSnapshot {
  const session = useSessionOptional();
  const [fetched, setFetched] = useState<AccountSnapshot | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setFetched(null);
      return;
    }
    if (session?.profile) return;

    let cancelled = false;
    void apiGet<ProfileDTO>("/api/profile")
      .then((profile) => {
        if (cancelled) return;
        setFetched({
          displayName: profile.displayName ?? "",
          avatarUrl: profile.avatarUrl,
          tier: profile.tier,
          tierStartedAt: profile.tierStartedAt,
        });
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, session?.profile]);

  if (!isAuthenticated) {
    return { displayName: "", avatarUrl: null, tier: null, tierStartedAt: null };
  }

  return {
    displayName: session?.displayName || fetched?.displayName || "",
    avatarUrl: session?.profile?.avatarUrl || fetched?.avatarUrl || null,
    tier: session?.profile?.tier ?? fetched?.tier ?? null,
    tierStartedAt: session?.profile?.tierStartedAt ?? fetched?.tierStartedAt ?? null,
  };
}

export function LandingAccountMenu({ snapshot }: { snapshot: AccountSnapshot }) {
  const { t } = useLang();
  const session = useSessionOptional();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { displayName, avatarUrl } = snapshot;

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = displayName || t("landing.nav.my_account");
  const localAvatar = Boolean(avatarUrl?.startsWith("/"));

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (session?.signOut) {
        await session.signOut();
      } else {
        await signOutUser();
      }
      window.location.assign("/");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="landing-account" ref={rootRef}>
      <button
        type="button"
        className="landing-account-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={label}
            width={32}
            height={32}
            className="landing-account-avatar"
            unoptimized={!localAvatar}
          />
        ) : (
          <span className="landing-account-avatar landing-account-avatar--fallback" aria-hidden>
            <User className="h-4 w-4" />
          </span>
        )}
        <span className="landing-account-name">{label}</span>
      </button>

      {open ? (
        <div className="landing-account-menu" role="menu">
          <Link
            href="/myaccount"
            role="menuitem"
            className="landing-account-item"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            {t("landing.nav.my_account")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="landing-account-item landing-account-item--danger"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "…" : t("myaccount.sign_out")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
