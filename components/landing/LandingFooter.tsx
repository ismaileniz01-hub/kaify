import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container flex flex-col items-center justify-between gap-6 py-12 md:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="/kaify-logo.png"
            alt="K.AIFY"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="text-sm font-semibold tracking-[0.1em] text-zinc-400">
            K.AIFY © 2026
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <a href="#about" className="transition hover:text-white">
            About
          </a>
          <a href="#coaches" className="transition hover:text-white">
            Coaches
          </a>
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#waitlist" className="transition hover:text-white">
            Waitlist
          </a>
        </nav>

        <p className="text-xs text-zinc-600">Fitness · Coaching · Made enjoyable</p>
      </div>
    </footer>
  );
}
