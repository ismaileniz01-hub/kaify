export default function MyAccountLoading() {
  return (
    <div className="phone-shell analytics-gradient flex flex-col gap-4 px-4 pb-8 pt-14">
      <div className="mx-auto h-24 w-24 premium-skeleton rounded-full" />
      <div className="mx-auto h-6 w-40 premium-skeleton rounded-full" />
      <div className="mt-4 h-32 premium-skeleton rounded-3xl" />
      <div className="h-20 premium-skeleton rounded-2xl" />
      <p className="sr-only">Loading</p>
    </div>
  );
}
