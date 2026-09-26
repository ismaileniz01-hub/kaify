"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from "react";
import { usePresence } from "@/lib/motion/use-presence";
import { hapticSelection } from "@/lib/native/haptics";
import { ANDROID_BACK_EVENT } from "@/lib/native/app-back-stack";

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
  /** Sheet drag handle. Defaults to true for sheet variant. */
  showHandle?: boolean;
};

const DRAG_DISMISS_PX = 88;

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
  showHandle,
}: MotionDialogProps) {
  const { mounted, state } = usePresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dragStartY = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const handleVisible = showHandle ?? variant === "sheet";
  const canDragDismiss = Boolean(onClose) && variant === "sheet";

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      dragStartY.current = null;
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setDragging(false);
    } else if (variant === "sheet") {
      void hapticSelection();
    }
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const inerted: HTMLElement[] = [];
    const markSiblingsInert = (node: HTMLElement | null) => {
      let current = node;
      while (current && current !== document.body) {
        const parent = current.parentElement;
        if (!parent) break;
        for (const sibling of Array.from(parent.children)) {
          if (sibling !== current && sibling instanceof HTMLElement) {
            if (!sibling.hasAttribute("inert")) {
              sibling.setAttribute("inert", "");
              inerted.push(sibling);
            }
          }
        }
        current = parent;
      }
    };
    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus();
      markSiblingsInert(panelRef.current);
    });

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
    const onAndroidBack = () => {
      const dialogs = document.querySelectorAll<HTMLElement>(
        '[data-motion-dialog="true"]:not([data-state="exiting"])',
      );
      const isTopmost = dialogs.item(dialogs.length - 1) === panelRef.current;
      if (isTopmost) onCloseRef.current?.();
    };
    window.addEventListener(ANDROID_BACK_EVENT, onAndroidBack);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      inerted.forEach((el) => el.removeAttribute("inert"));
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ANDROID_BACK_EVENT, onAndroidBack);
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

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!canDragDismiss) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-sheet-scroll]")) {
      const scroller = target.closest("[data-sheet-scroll]") as HTMLElement;
      if (scroller.scrollTop > 0) return;
    }
    dragStartY.current = event.touches[0]?.clientY ?? null;
    setDragging(true);
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    const y = event.touches[0]?.clientY ?? dragStartY.current;
    const next = Math.max(0, y - dragStartY.current);
    dragOffsetRef.current = next;
    setDragOffset(next);
  };

  const onTouchEnd = () => {
    if (dragStartY.current == null) return;
    const offset = dragOffsetRef.current;
    dragStartY.current = null;
    setDragging(false);
    if (offset >= DRAG_DISMISS_PX && onCloseRef.current) {
      onCloseRef.current();
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  const panelStyle: CSSProperties | undefined =
    variant === "sheet" && dragOffset > 0
      ? {
          transform: `translateY(${dragOffset}px)`,
          transition: dragging ? "none" : undefined,
        }
      : undefined;

  return (
    <div
      data-app-overlay="open"
      className={`motion-overlay fixed inset-0 flex justify-center bg-black/70 backdrop-blur-sm ${
        variant === "sheet" ? "items-end sm:items-center" : "items-center"
      } ${fullBleed ? "" : "p-4"} ${className}`}
      data-state={state}
      onMouseDown={handleBackdrop}
      onClick={handleBackdrop}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-motion-dialog="true"
        data-variant={variant}
        tabIndex={-1}
        data-state={state}
        style={panelStyle}
        className={`${
          variant === "sheet" ? "motion-sheet" : "motion-panel"
        } outline-none ${panelClassName}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {handleVisible ? (
          <div className="motion-sheet-handle" aria-hidden>
            <span />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
