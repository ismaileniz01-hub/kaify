"use client";

/** Pulse placeholders while session data loads. */
export function WelcomeSkeleton() {
  return (
    <div className="phone-shell welcome-page relative flex animate-pulse flex-col overflow-hidden">
      <div className="relative z-20 flex items-center justify-between px-4 pt-14">
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="h-8 w-8 rounded-full bg-white/10" />
        </div>
        <div className="h-8 w-24 rounded-full bg-white/10" />
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-full bg-white/10" />
          <div className="h-8 w-8 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="relative z-10 flex flex-1 flex-col px-6 pt-6">
        <div className="mx-auto h-12 w-48 rounded-xl bg-white/10" />
        <div className="mx-auto mt-4 h-4 w-56 rounded bg-white/10" />
        <div className="mt-8 grid grid-cols-2 gap-3 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}
