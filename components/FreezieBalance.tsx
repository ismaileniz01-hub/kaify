"use client";

import { Snowflake } from "lucide-react";
import { getFreezieBalance } from "@/lib/freezie";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";

type FreezieBalanceProps = {
  size?: "sm" | "md";
  animate?: boolean;
  refreshKey?: number;
  /** When set, overrides localStorage demo balance. */
  balance?: number;
};

export function FreezieBalance({
  size = "sm",
  animate = true,
  refreshKey = 0,
  balance: balanceProp,
}: FreezieBalanceProps) {
  const { t } = useLang();
  const [balance, setBalance] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (balanceProp !== undefined) {
      setBalance(balanceProp);
    } else {
      setBalance(getFreezieBalance());
    }
  }, [refreshKey, balanceProp]);

  useEffect(() => {
    if (balanceProp !== undefined) return;
    const interval = setInterval(() => {
      setBalance(getFreezieBalance());
    }, 3000);
    return () => clearInterval(interval);
  }, [balanceProp]);

  if (!mounted) return null;

  const sizeClasses = size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm";

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] ${sizeClasses}`}
      title={t("freezie.title")}
    >
      <Snowflake
        className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
        style={{
          color: "#38bdf8",
          filter: `drop-shadow(0 0 4px rgba(56,189,248,0.4))`,
          animation: animate ? "spin 3s linear infinite" : undefined,
        }}
      />
      <span className="font-bold text-sky-300">{balance}</span>
    </div>
  );
}