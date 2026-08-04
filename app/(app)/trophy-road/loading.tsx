export default function SegmentLoading() {
  return (
    <div className="phone-shell analytics-gradient flex flex-col gap-4 px-4 pb-8 pt-14">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="h-36 animate-pulse rounded-3xl bg-white/5" />
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
      </div>
      <p className="sr-only">Loading</p>
    </div>
  );
}
