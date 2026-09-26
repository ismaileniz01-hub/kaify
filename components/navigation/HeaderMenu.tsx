"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { hapticSelection } from "@/lib/native/haptics";

export type HeaderMenuItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

/** Secondary header actions that do not fit beside the balance chip. */
export function HeaderMenu({ items }: { items: HeaderMenuItem[] }) {
  const { t } = useLang();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="app-header__action"
        aria-label={t("landing.nav.menu")}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          void hapticSelection();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 top-[calc(100%+0.35rem)] z-40 min-w-44 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 py-1 shadow-xl shadow-black/40"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-zinc-200 hover:bg-white/5"
              onClick={() => {
                void hapticSelection();
                setOpen(false);
              }}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
