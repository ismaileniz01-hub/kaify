"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "./session-context";
import { apiGet, apiPatch } from "./api/client";
import type {
  NotificationDTO,
  NotificationListDTO,
} from "./services/notifications.service";
import { playNotificationChime } from "./notifications/sound";

type NotificationContextValue = {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const knownIds = useRef<Set<string>>(new Set());
  const hasPrimed = useRef(false);

  const refresh = useCallback(async () => {
    if (!session.isAuthenticated || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await apiGet<NotificationListDTO>("/api/notifications");
      const incomingIds = new Set(res.items.map((n) => n.id));
      const hasNew =
        hasPrimed.current &&
        res.items.some((n) => !knownIds.current.has(n.id) && !n.read);

      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
      knownIds.current = incomingIds;
      hasPrimed.current = true;

      if (hasNew) {
        playNotificationChime();
      }
    } catch {
      // Silent: notifications are non-critical; keep last known state.
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [session.isAuthenticated]);

  // Initial load + polling while authenticated.
  useEffect(() => {
    if (!session.isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      knownIds.current = new Set();
      hasPrimed.current = false;
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session.isAuthenticated, refresh]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiPatch("/api/notifications", {});
    } catch {
      void refresh();
    }
  }, [unreadCount, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      let wasUnread = false;
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === id && !n.read) {
            wasUnread = true;
            return { ...n, read: true };
          }
          return n;
        }),
      );
      if (!wasUnread) return;
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await apiPatch("/api/notifications", { ids: [id] });
      } catch {
        void refresh();
      }
    },
    [refresh],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAllRead, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
