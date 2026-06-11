"use client";

const ORBS = [
  { top: "12%", left: "8%", size: 6, delay: 0, color: "rgba(168,85,247,0.5)" },
  { top: "28%", left: "85%", size: 4, delay: 1.2, color: "rgba(6,182,212,0.45)" },
  { top: "55%", left: "15%", size: 5, delay: 0.6, color: "rgba(168,85,247,0.35)" },
  { top: "70%", left: "78%", size: 7, delay: 2, color: "rgba(249,115,22,0.3)" },
  { top: "40%", left: "50%", size: 3, delay: 1.8, color: "rgba(34,197,94,0.35)" },
  { top: "85%", left: "35%", size: 5, delay: 0.9, color: "rgba(168,85,247,0.4)" },
];

export function FloatingOrbs() {
  return (
    <div className="landing-orbs pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {ORBS.map((orb, i) => (
        <span
          key={i}
          className="landing-orb"
          style={{
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
