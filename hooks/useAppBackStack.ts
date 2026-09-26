"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  markAppBackPop,
  noteAppPathChange,
} from "@/lib/native/app-back-stack";

/** Tracks in-app forward navigations so Android back can pop or minimize. */
export function useAppBackStack(): void {
  const pathname = usePathname() || "";
  const previousRef = useRef(pathname);

  useEffect(() => {
    const onPop = () => markAppBackPop();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    noteAppPathChange(previousRef.current, pathname);
    previousRef.current = pathname;
  }, [pathname]);
}
