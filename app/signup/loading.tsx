export default function SignupLoading() {
  return (
    <div className="phone-shell flex flex-col items-center justify-center gap-4 px-6">
      <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-6 w-48 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-52 w-full max-w-sm animate-pulse rounded-3xl bg-white/5" />
      <p className="sr-only">Loading</p>
    </div>
  );
}
