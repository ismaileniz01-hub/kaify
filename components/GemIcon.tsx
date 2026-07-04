import { Gem } from "lucide-react";

type GemIconProps = {
  size?: number;
  className?: string;
  sparkle?: boolean;
};

export function GemIcon({ size = 16, className = "", sparkle = false }: GemIconProps) {
  return (
    <Gem
      size={size}
      strokeWidth={2.5}
      className={`${sparkle ? "gem-sparkle" : ""} ${className}`.trim()}
      style={{ color: "#a855f7", filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))" }}
      aria-hidden
    />
  );
}
