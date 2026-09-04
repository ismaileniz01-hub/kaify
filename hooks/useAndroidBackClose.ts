"use client";

import { useEffect } from "react";
import { ANDROID_BACK_EVENT } from "@/lib/native/app-back-stack";

/** Close a custom overlay when Android back fires (MotionDialog already listens). */
export function useAndroidBackClose(active: boolean, onClose?: () => void): void {
  useEffect(() => {
    if (!active || !onClose) return;
    const onBack = () => onClose();
    window.addEventListener(ANDROID_BACK_EVENT, onBack);
    return () => window.removeEventListener(ANDROID_BACK_EVENT, onBack);
  }, [active, onClose]);
}
