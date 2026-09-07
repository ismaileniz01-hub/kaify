"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { shouldShowBottomNav } from "@/lib/navigation/bottom-nav";
import { useSessionOptional } from "@/lib/session-contexts";
import { useLang } from "@/lib/lang-context";

const AUTH_PENDING_FAILSAFE_MS = 8_000;

/** App chrome: bottom dock + content inset when the dock is visible. */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const { t } = useLang();
  const showNav = shouldShowBottomNav(pathname);
  const [bootStuck, setBootStuck] = useState(false);

  const session = useSessionOptional();
  const publicChrome =
    pathname.startsWith("/login") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup") ||
    pathname === "/pricing" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");
  const authPending =
    Boolean(session?.isLoading) && !publicChrome && !bootStuck;

  useEffect(() => {
    if (!session?.isLoading || publicChrome) {
      setBootStuck(false);
      return;
    }
    const timer = window.setTimeout(() => setBootStuck(true), AUTH_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [session?.isLoading, publicChrome]);

  return (
    <div className={showNav ? "has-bottom-nav" : undefined}>
      {authPending ? (
        <div
          className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-400"
          aria-busy="true"
          aria-live="polite"
        >
          {t("a11y.loading_page")}
        </div>
      ) : (
        children
      )}
      <BottomNav />
    </div>
  );
}
