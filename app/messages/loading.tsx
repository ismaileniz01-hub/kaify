export default function MessagesLoading() {
  return (
    <div className="phone-shell flex flex-col gap-3 px-4 pb-8 pt-14">
      <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white/5" />
      ))}
      <p className="sr-only">Loading</p>
    </div>
  );
}
