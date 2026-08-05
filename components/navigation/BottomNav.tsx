"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Home, MessageCircle, ShoppingBag } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { shouldShowBottomNav } from "@/lib/navigation/bottom-nav";

const TABS = [
  {
    href: "/welcome",
    labelKey: "nav.home" as const,
    icon: Home,
    isActive: (path: string) => path === "/welcome",
  },
  {
    href: "/messages",
    labelKey: "nav.messages" as const,
    icon: MessageCircle,
    isActive: (path: string) =>
      path === "/messages" || path.startsWith("/messages/"),
  },
  {
    href: "/streak",
    labelKey: "nav.streak" as const,
    icon: Flame,
    isActive: (path: string) => path.startsWith("/streak"),
  },
  {
    href: "/trophy-road",
    labelKey: "nav.market" as const,
    icon: ShoppingBag,
    isActive: (path: string) => path.startsWith("/trophy-road"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname() || "";
  const { t } = useLang();

  if (!shouldShowBottomNav(pathname)) return null;

  return (
    <nav
      className="bottom-nav"
      aria-label={t("nav.primary")}
    >
      <ul className="bottom-nav__list">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="bottom-nav__item">
              <Link
                href={tab.href}
                prefetch
                className={`bottom-nav__link touch-44 ${active ? "bottom-nav__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="bottom-nav__icon" strokeWidth={active ? 2.35 : 1.85} aria-hidden />
                <span className="bottom-nav__label">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
