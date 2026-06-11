"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale";
};

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollRevealProps) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  const dirClass = {
    up: "landing-reveal--up",
    down: "landing-reveal--down",
    left: "landing-reveal--left",
    right: "landing-reveal--right",
    scale: "landing-reveal--scale",
  }[direction];

  return (
    <div
      ref={ref}
      className={`landing-reveal ${dirClass} ${visible ? "landing-reveal--visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
