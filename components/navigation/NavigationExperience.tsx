"use client";

import {
  startTransition,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/lib/lang-context";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => {
    finished: Promise<void>;
  };
};

const TRANSITION_TIMEOUT_MS = 1_200;

function getEligibleNavigation(
  event: ReactMouseEvent<HTMLDivElement>,
): { href: string; path: string } | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (
    !anchor ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    anchor.dataset.noTransition === "true"
  ) {
    return null;
  }

  const url = new URL(anchor.href, window.location.href);
  if (
    url.origin !== window.location.origin ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    return null;
  }

  const current = new URL(window.location.href);
  if (url.pathname === current.pathname && url.search === current.search) {
    return null;
  }

  return {
    href: `${url.pathname}${url.search}${url.hash}`,
    path: url.pathname,
  };
}

export function NavigationExperience({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const pendingPathRef = useRef<string | null>(null);
  const resolveTransitionRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishNavigation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    pendingPathRef.current = null;
    resolveTransitionRef.current?.();
    resolveTransitionRef.current = null;
    document.documentElement.removeAttribute("data-route-transition");
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    if (pendingPathRef.current && pathname === pendingPathRef.current) {
      finishNavigation();
    }
  }, [finishNavigation, pathname]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      resolveTransitionRef.current?.();
      document.documentElement.removeAttribute("data-route-transition");
    },
    [],
  );

  const navigate = useCallback(
    (href: string, path: string) => {
      pendingPathRef.current = path;
      setIsNavigating(true);
      timeoutRef.current = setTimeout(
        finishNavigation,
        path === pathname ? 400 : TRANSITION_TIMEOUT_MS,
      );

      const update = () =>
        new Promise<void>((resolve) => {
          resolveTransitionRef.current = resolve;
          startTransition(() => router.push(href));
        });

      const documentWithTransitions = document as ViewTransitionDocument;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (documentWithTransitions.startViewTransition && !reduceMotion) {
        document.documentElement.setAttribute("data-route-transition", "true");
        documentWithTransitions.startViewTransition(update).finished.catch(finishNavigation);
      } else {
        void update();
      }
    },
    [finishNavigation, pathname, router],
  );

  const handleClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isNavigating) return;
      const navigation = getEligibleNavigation(event);
      if (!navigation) return;

      event.preventDefault();
      navigate(navigation.href, navigation.path);
    },
    [isNavigating, navigate],
  );

  return (
    <div
      className="app-navigation-root"
      data-navigating={isNavigating ? "true" : "false"}
      onClickCapture={handleClickCapture}
    >
      <div
        className="route-progress"
        role="progressbar"
        aria-label={t("a11y.loading_page")}
        aria-hidden={!isNavigating}
      >
        <span />
      </div>
      {children}
    </div>
  );
}
