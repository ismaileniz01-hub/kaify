import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type GradientVariant = "purple" | "blue" | "orange" | "gold" | "green";

type WelcomeCardProps = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: GradientVariant;
};

export function WelcomeCard({
  href,
  title,
  subtitle,
  icon: Icon,
  gradient,
}: WelcomeCardProps) {
  return (
    <Link
      href={href}
      className={`analytics-card analytics-card--${gradient} relative flex min-h-[118px] flex-col justify-between p-4 transition active:scale-[0.97]`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-purple-200 ring-1 ring-white/10">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">{subtitle}</p>
      </div>
    </Link>
  );
}
