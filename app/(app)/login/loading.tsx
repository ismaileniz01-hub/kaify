export default function LoginLoading() {
  return (
    <div className="phone-shell flex flex-col items-center justify-center gap-4 px-6">
      <div className="h-12 w-12 premium-skeleton rounded-2xl" />
      <div className="h-6 w-48 premium-skeleton rounded-full" />
      <div className="mt-4 h-40 w-full max-w-sm premium-skeleton rounded-3xl" />
      <p className="sr-only">Loading</p>
    </div>
  );
}
