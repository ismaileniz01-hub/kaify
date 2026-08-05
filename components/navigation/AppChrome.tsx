"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { shouldShowBottomNav } from "@/lib/navigation/bottom-nav";

/** App chrome: bottom dock + content inset when the dock is visible. */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const showNav = shouldShowBottomNav(pathname);

  return (
    <div className={showNav ? "has-bottom-nav" : undefined}>
      {children}
      <BottomNav />
    </div>
  );
}
