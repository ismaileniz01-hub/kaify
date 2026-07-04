import type { AvatarEffect } from "@/lib/aura-effects";
import { auraCssVars, type AuraVisualConfig } from "@/lib/aura-effects";

type AuraEffectLayerProps = {
  effect: AvatarEffect;
  config: AuraVisualConfig;
  /** Scale inset for xs/sm/md/lg/xl containers */
  scale?: "sm" | "md" | "lg";
  className?: string;
};

const scaleClass = {
  sm: "premium-aura--sm",
  md: "",
  lg: "premium-aura--lg",
};

function FireLayer({ style }: { style: React.CSSProperties }) {
  return (
    <div className="fire-aura" style={style}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="fire-spark" style={style} />
      ))}
    </div>
  );
}

function ElectricLayer({ style }: { style: React.CSSProperties }) {
  return (
    <div className="electric-aura" style={style}>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="electric-bolt" style={style} />
      ))}
    </div>
  );
}

function PhoenixLayer({ style, scale }: { style: React.CSSProperties; scale: string }) {
  return (
    <div className={`premium-aura premium-aura-phoenix ${scale}`} style={style}>
      <span className="phoenix-wing phoenix-wing--left" aria-hidden />
      <span className="phoenix-wing phoenix-wing--right" aria-hidden />
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="phoenix-ember" style={style} aria-hidden />
      ))}
    </div>
  );
}

function NebulaLayer({ style, scale }: { style: React.CSSProperties; scale: string }) {
  return (
    <div className={`premium-aura premium-aura-nebula ${scale}`} style={style}>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="nebula-star" aria-hidden />
      ))}
      <span className="nebula-core" aria-hidden />
    </div>
  );
}

function ThunderLayer({ style, scale }: { style: React.CSSProperties; scale: string }) {
  return (
    <div className={`premium-aura premium-aura-thunder ${scale}`} style={style}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="thunder-bolt" style={style} aria-hidden />
      ))}
      <span className="thunder-core" aria-hidden />
    </div>
  );
}

function EclipseLayer({ style, scale }: { style: React.CSSProperties; scale: string }) {
  return (
    <div className={`premium-aura premium-aura-eclipse ${scale}`} style={style}>
      <span className="eclipse-ring" aria-hidden />
      <span className="eclipse-corona" aria-hidden />
      {["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ"].map((rune, i) => (
        <span key={i} className="eclipse-rune" aria-hidden>
          {rune}
        </span>
      ))}
    </div>
  );
}

function PrismLayer({ style, scale }: { style: React.CSSProperties; scale: string }) {
  return (
    <div className={`premium-aura premium-aura-prism ${scale}`} style={style}>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="prism-shard" aria-hidden />
      ))}
      <span className="prism-beam prism-beam--1" aria-hidden />
      <span className="prism-beam prism-beam--2" aria-hidden />
      <span className="prism-beam prism-beam--3" aria-hidden />
    </div>
  );
}

/** Renders animated aura particles behind an avatar. */
export function AuraEffectLayer({
  effect,
  config,
  scale = "md",
  className = "",
}: AuraEffectLayerProps) {
  if (effect === "none") return null;

  const style = auraCssVars(config);
  const scaleCls = scaleClass[scale];

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {effect === "fire" && <FireLayer style={style} />}
      {effect === "electric" && <ElectricLayer style={style} />}
      {effect === "phoenix" && <PhoenixLayer style={style} scale={scaleCls} />}
      {effect === "nebula" && <NebulaLayer style={style} scale={scaleCls} />}
      {effect === "thunder" && <ThunderLayer style={style} scale={scaleCls} />}
      {effect === "eclipse" && <EclipseLayer style={style} scale={scaleCls} />}
      {effect === "prism" && <PrismLayer style={style} scale={scaleCls} />}
    </div>
  );
}
