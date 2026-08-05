export default function LibraryLoading() {
  return (
    <div className="phone-shell analytics-gradient flex flex-col gap-4 px-4 pb-8 pt-14">
      <div className="h-8 w-40 premium-skeleton rounded-full" />
      <div className="h-28 premium-skeleton rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 premium-skeleton rounded-2xl" />
        <div className="h-24 premium-skeleton rounded-2xl" />
      </div>
      <p className="sr-only">Loading</p>
    </div>
  );
}
