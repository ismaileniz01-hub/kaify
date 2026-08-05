/** Layout-matched placeholders while session data loads. */
export function WelcomeSkeleton() {
  return (
    <div
      className="phone-shell welcome-page relative flex flex-col overflow-hidden"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading</span>
      <div className="relative z-20 flex items-center justify-between px-4 pt-14">
        <div className="flex gap-2">
          <div className="premium-skeleton h-11 w-11 rounded-full" />
          <div className="premium-skeleton h-11 w-11 rounded-full" />
        </div>
        <div className="premium-skeleton h-11 w-24 rounded-full" />
        <div className="flex gap-2">
          <div className="premium-skeleton h-11 w-16 rounded-full" />
          <div className="premium-skeleton h-11 w-11 rounded-full" />
        </div>
      </div>
      <div className="relative z-10 flex flex-1 flex-col px-6 pt-6">
        <div className="premium-skeleton mx-auto h-12 w-48 rounded-xl" />
        <div className="premium-skeleton mx-auto mt-4 h-4 w-56 rounded" />
        <div className="mt-8 grid grid-cols-2 gap-3 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="premium-skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
