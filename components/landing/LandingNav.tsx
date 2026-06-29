"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";
const LINKS = [
  { href: "#about", label: "About Us" },
  { href: "#coaches", label: "Coaches" },
  { href: "#features", label: "Features" },
  { href: "#streak", label: "Streak" },
  { href: "#kai", label: "Dragon Kai" },
];

export function LandingNav() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`landing-nav ${scrolled ? "landing-nav--scrolled" : ""}`}>
      <div className="landing-container flex items-center justify-between gap-4">
        <a href="#" className="flex shrink-0 items-center">
          <Image
            src="/kaify-logo.png"
            alt="K.AIFY"
            width={48}
            height={48}
            className="h-11 w-11 rounded-xl object-cover shadow-[0_0_24px_rgba(168,85,247,0.35)]"
          />
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4 rounded-sm"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#waitlist"
          className="landing-btn landing-btn--primary shrink-0 text-sm active:scale-[0.97]"
        >
          Join Waitlist
        </a>
      </div>
    </header>
  );
}
