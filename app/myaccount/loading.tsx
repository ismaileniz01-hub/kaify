export default function MyAccountLoading() {
  return (
    <div className="phone-shell analytics-gradient flex flex-col gap-4 px-4 pb-8 pt-14">
      <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-white/10" />
      <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-32 animate-pulse rounded-3xl bg-white/5" />
      <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
      <p className="sr-only">Loading</p>
    </div>
  );
}
