"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { MOTION_EXIT_MS } from "@/lib/motion/use-presence";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: number;
  leaving: boolean;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-400/25 text-emerald-300",
  error: "border-red-400/25 text-red-300",
  info: "border-purple-400/25 text-purple-300",
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (tone === "error") return <TriangleAlert className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [items, setItems] = useState<ToastItem[]>([]);
  const [politeAnnouncement, setPoliteAnnouncement] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const itemsRef = useRef<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());
  const exitTimersRef = useRef(new Map<number, number>());
  const durationsRef = useRef(new Map<number, number>());

  const updateItems = useCallback(
    (updater: (current: ToastItem[]) => ToastItem[]) => {
      setItems((current) => {
        const next = updater(current);
        itemsRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      exitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
      exitTimersRef.current.clear();
      durationsRef.current.clear();
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    if (!itemsRef.current.some((item) => item.id === id)) return;
    const activeTimer = timersRef.current.get(id);
    if (activeTimer) window.clearTimeout(activeTimer);
    timersRef.current.delete(id);
    updateItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, leaving: true } : item,
      ),
    );
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const exitTimer = window.setTimeout(() => {
      updateItems((current) => current.filter((item) => item.id !== id));
      exitTimersRef.current.delete(id);
      durationsRef.current.delete(id);
    }, reduceMotion ? 0 : MOTION_EXIT_MS);
    exitTimersRef.current.set(id, exitTimer);
  }, [updateItems]);

  const scheduleDismiss = useCallback(
    (id: number) => {
      if (itemsRef.current.find((item) => item.id === id)?.leaving) return;
      const currentTimer = timersRef.current.get(id);
      if (currentTimer) window.clearTimeout(currentTimer);
      const duration = durationsRef.current.get(id) ?? 3200;
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  const pauseDismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current;
      const duration = input.duration ?? 3200;
      const announcement = {
        id,
        text: [input.title, input.description].filter(Boolean).join(". "),
      };
      if (input.tone === "error") {
        setAssertiveAnnouncement(announcement);
      } else {
        setPoliteAnnouncement(announcement);
      }
      const overflow = itemsRef.current.slice(0, -2);
      overflow.forEach((item) => {
        const timer = timersRef.current.get(item.id);
        if (timer) window.clearTimeout(timer);
        const exitTimer = exitTimersRef.current.get(item.id);
        if (exitTimer) window.clearTimeout(exitTimer);
        timersRef.current.delete(item.id);
        exitTimersRef.current.delete(item.id);
        durationsRef.current.delete(item.id);
      });
      durationsRef.current.set(id, duration);
      updateItems((current) => [
        ...current.slice(-2),
        { ...input, id, leaving: false },
      ]);
      scheduleDismiss(id);
    },
    [scheduleDismiss, updateItems],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeAnnouncement?.text}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveAnnouncement?.text}
      </div>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[10000] flex flex-col items-center gap-2 px-4 pt-[calc(var(--safe-top)+1rem)]"
      >
        {items.map((item) => {
          const tone = item.tone ?? "info";
          return (
            <div
              key={item.id}
              role="group"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") pauseDismiss(item.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") scheduleDismiss(item.id);
              }}
              onFocusCapture={() => pauseDismiss(item.id)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  scheduleDismiss(item.id);
                }
              }}
              className={`premium-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-zinc-950/92 px-4 py-3.5 shadow-2xl shadow-black/40 backdrop-blur-xl ${toneStyles[tone]} ${
                item.leaving ? "premium-toast--leaving" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0" aria-hidden>
                <ToastIcon tone={tone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="touch-44 -mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-white/5 hover:text-white"
                aria-label={t("common.dismiss")}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
