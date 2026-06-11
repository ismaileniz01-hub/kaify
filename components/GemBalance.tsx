import { Gem } from "lucide-react";

type GemBalanceProps = {
  balance: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { icon: 16, text: "text-xs", gap: "gap-1", px: "px-2.5", py: "py-1" },
  md: { icon: 20, text: "text-sm", gap: "gap-1.5", px: "px-3", py: "py-1.5" },
  lg: { icon: 28, text: "text-lg", gap: "gap-2", px: "px-4", py: "py-2" },
};

export function GemBalance({
  balance,
  size = "sm",
  animate = false,
  className = "",
}: GemBalanceProps) {
  const s = sizeMap[size];

  return (
    <div
      className={`inline-flex items-center ${s.gap} ${s.px} ${s.py} rounded-full border border-purple-400/30 bg-[#0a0612] shadow-[0_0_12px_rgba(168,85,247,0.2)] ${className}`}
    >
      <Gem
        size={s.icon}
        strokeWidth={2.5}
        className={animate ? "gem-sparkle" : ""}
        style={{ color: "#a855f7", filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))" }}
        aria-hidden
      />
      <span
        className={`font-bold tracking-tight text-purple-300 ${s.text}`}
        style={{
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          textShadow: "0 0 12px rgba(168,85,247,0.3)",
        }}
      >
        {balance.toLocaleString()}
      </span>
    </div>
  );
}
