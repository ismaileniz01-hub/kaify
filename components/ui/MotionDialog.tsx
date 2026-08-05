"use client";

import {
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePresence } from "@/lib/motion/use-presence";

type MotionDialogProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  labelledBy: string;
  className?: string;
  panelClassName?: string;
  variant?: "center" | "sheet";
  closeOnBackdrop?: boolean;
  fullBleed?: boolean;
};

export function MotionDialog({
  open,
  onClose,
  children,
  labelledBy,
  className = "",
  panelClassName = "",
  variant = "center",
  closeOnBackdrop = true,
  fullBleed = false,
}: MotionDialogProps) {
  const { mounted, state } = usePresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panelRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll<HTMLElement>(
        '[data-motion-dialog="true"]:not([data-state="exiting"])',
      );
      const isTopmost = dialogs.item(dialogs.length - 1) === panelRef.current;
      if (event.key === "Escape" && onCloseRef.current && isTopmost) {
        event.stopImmediatePropagation();
        onCloseRef.current();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          !element.closest('[aria-hidden="true"]'),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!mounted) return null;

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (
      closeOnBackdrop &&
      onClose &&
      event.target === event.currentTarget
    ) {
      onClose();
    }
  };

  return (
    <div
      className={`motion-overlay fixed inset-0 flex justify-center bg-black/70 backdrop-blur-sm ${
        variant === "sheet" ? "items-end sm:items-center" : "items-center"
      } ${fullBleed ? "" : "p-4"} ${className}`}
      data-state={state}
      onMouseDown={handleBackdrop}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-motion-dialog="true"
        tabIndex={-1}
        data-state={state}
        className={`${
          variant === "sheet" ? "motion-sheet" : "motion-panel"
        } outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
