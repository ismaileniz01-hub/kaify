import Image from "next/image";
import type { AuraColor } from "@/lib/kai-context";

export type AvatarEffect = "none" | "fire" | "electric";

type ContactAvatarProps = {
  src: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  pulse?: boolean;
  effect?: AvatarEffect;
  auraColor?: AuraColor;
  className?: string;
};

const sizes = {
  xs: { box: "h-8 w-8", img: 32 },
  sm: { box: "h-11 w-11", img: 44 },
  md: { box: "h-14 w-14", img: 52 },
  lg: { box: "h-20 w-20", img: 76 },
  xl: { box: "h-28 w-28", img: 104 },
};

const auraStyles: Record<AuraColor, { spark: string; ring: string; shadow: string; cssColor: string }> = {
  default: { spark: "text-purple-300", ring: "bg-purple-400", shadow: "shadow-purple-500/40", cssColor: "#d8b4fe" },
  blue: { spark: "text-cyan-300", ring: "bg-cyan-400", shadow: "shadow-cyan-500/40", cssColor: "#67e8f9" },
  red: { spark: "text-red-300", ring: "bg-red-400", shadow: "shadow-red-500/40", cssColor: "#fca5a5" },
  green: { spark: "text-emerald-300", ring: "bg-emerald-400", shadow: "shadow-emerald-500/40", cssColor: "#6ee7b7" },
  pink: { spark: "text-pink-300", ring: "bg-pink-400", shadow: "shadow-pink-500/40", cssColor: "#f9a8d4" },
  purple: { spark: "text-purple-300", ring: "bg-purple-400", shadow: "shadow-purple-500/40", cssColor: "#d8b4fe" },
  gold: { spark: "text-yellow-300", ring: "bg-yellow-400", shadow: "shadow-yellow-500/40", cssColor: "#fde047" },
  white: { spark: "text-white", ring: "bg-white/60", shadow: "shadow-white/30", cssColor: "#ffffff" },
  orange: { spark: "text-orange-300", ring: "bg-orange-400", shadow: "shadow-orange-500/40", cssColor: "#fdba74" },
  indigo: { spark: "text-indigo-300", ring: "bg-indigo-400", shadow: "shadow-indigo-500/40", cssColor: "#a5b4fc" },
  electric: { spark: "text-sky-300", ring: "bg-sky-400", shadow: "shadow-sky-500/40", cssColor: "#7dd3fc" },
};

export function ContactAvatar({
  src,
  alt,
  size = "md",
  pulse = false,
  effect = "none",
  auraColor = "default",
  className = "",
}: ContactAvatarProps) {
  const { box, img } = sizes[size];
  const aura = auraStyles[auraColor];

  return (
    <div className={`relative ${className}`}>
      {pulse && (
        <span
          className="absolute -inset-2 animate-ping rounded-full bg-purple-500/20"
          aria-hidden
        />
      )}
      <div className={`relative ${box} flex items-center justify-center`}>
        {effect === "fire" && (
          <>
            <div className="fire-aura" style={{ "--spark-color": aura.cssColor } as React.CSSProperties}>
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="fire-spark" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
            </div>
          </>
        )}
        {effect === "electric" && (
          <>
            <div className="electric-aura" style={{ "--spark-color": aura.cssColor } as React.CSSProperties}>
              <span className="electric-bolt" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="electric-bolt" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="electric-bolt" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="electric-bolt" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="electric-bolt" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
              <span className="electric-bolt" style={{ "--spark-color": aura.cssColor } as React.CSSProperties} />
            </div>
          </>
        )}
        <Image
          src={src}
          alt={alt}
          width={img}
          height={img}
          unoptimized
          className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        />
      </div>
    </div>
  );
}
