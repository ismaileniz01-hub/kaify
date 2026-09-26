import type { LucideIcon } from "lucide-react";
import {
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Timer,
  Weight,
} from "lucide-react";

const ICON_SET: LucideIcon[] = [
  Dumbbell,
  HeartPulse,
  Flame,
  Footprints,
  Timer,
  Weight,
];

type Placement = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  rotate: number;
  opacity: number;
};

function buildIcons(): Placement[] {
  const items: Placement[] = [];
  const cols = 5;
  const rows = 9;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const Icon = ICON_SET[(row * cols + col) % ICON_SET.length]!;
      items.push({
        Icon,
        top: `${row * (100 / rows) + (col % 2) * 3 + 1}%`,
        left: `${col * (100 / cols) + (row % 2) * 4 + 2}%`,
        size: 22 + ((row + col) % 4) * 6,
        rotate: -28 + ((row * 17 + col * 23) % 56),
        opacity: Math.min(0.32 + ((row + col) % 3) * 0.08, 0.48),
      });
    }
  }
  return items;
}

const FITNESS_ICONS = buildIcons();

/** Matches web FitnessWallpaper gradient + embossed icons (plain CSS classes). */
export function NativeFitnessWallpaper() {
  return (
    <div className="fitness-wallpaper" aria-hidden>
      <div className="fitness-wallpaper__gradient" />
      {FITNESS_ICONS.map((item, i) => (
        <div
          key={i}
          className="fitness-wallpaper__icon fitness-layer-icon"
          style={{ top: item.top, left: item.left }}
        >
          <item.Icon
            size={item.size}
            strokeWidth={2}
            className="fitness-emboss"
            style={{
              transform: `rotate(${item.rotate}deg)`,
              opacity: item.opacity,
            }}
          />
        </div>
      ))}
      <div className="fitness-wallpaper__vignette" />
      <div className="fitness-wallpaper__bottom" />
    </div>
  );
}
