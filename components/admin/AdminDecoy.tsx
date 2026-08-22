/** Public /admin honeypot — image only, no copy or chrome. */
export function AdminDecoy() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nice-try-diddy.png"
        alt=""
        className="h-full w-full object-contain"
      />
    </div>
  );
}
