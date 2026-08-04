export default function AnalyticsLoading() {
  return (
    <div className="phone-shell analytics-gradient flex flex-col gap-4 px-4 pb-8 pt-14">
      <div className="h-8 w-36 animate-pulse rounded-full bg-white/10" />
      <div className="h-40 animate-pulse rounded-3xl bg-white/5" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      </div>
      <p className="sr-only">Loading</p>
    </div>
  );
}
