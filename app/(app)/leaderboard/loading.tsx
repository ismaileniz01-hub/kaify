import { SrOnlyLoading } from "@/components/i18n/SrOnlyLoading";

export default function SegmentLoading() {
  return (
    <div className="phone-shell analytics-gradient flex flex-col gap-4 px-4 pb-8 pt-14">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 premium-skeleton rounded-full" />
        <div className="h-6 w-28 premium-skeleton rounded-full" />
        <div className="h-8 w-8 premium-skeleton rounded-full" />
      </div>
      <div className="h-36 premium-skeleton rounded-3xl" />
      <div className="space-y-3">
        <div className="h-16 premium-skeleton rounded-2xl" />
        <div className="h-16 premium-skeleton rounded-2xl" />
        <div className="h-16 premium-skeleton rounded-2xl" />
      </div>
      <SrOnlyLoading />
    </div>
  );
}
