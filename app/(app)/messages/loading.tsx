export default function MessagesLoading() {
  return (
    <div className="phone-shell flex flex-col gap-3 px-4 pb-8 pt-14">
      <div className="h-6 w-32 premium-skeleton rounded-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[72px] premium-skeleton rounded-2xl" />
      ))}
      <p className="sr-only">Loading</p>
    </div>
  );
}
