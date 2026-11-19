"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import {
  getPaddleClientToken,
  getPaddleEnvironment,
  isPaddleConfigured,
} from "@/lib/billing/paddle-config";

type PaddleContextValue = {
  paddle: Paddle | undefined;
  ready: boolean;
  configured: boolean;
  checkoutCompleted: boolean;
  /** Price ID of the last completed checkout (first line item). */
  completedPriceId: string | null;
};

const PaddleContext = createContext<PaddleContextValue>({
  paddle: undefined,
  ready: false,
  configured: false,
  checkoutCompleted: false,
  completedPriceId: null,
});

export function usePaddle(): PaddleContextValue {
  return useContext(PaddleContext);
}

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [ready, setReady] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [completedPriceId, setCompletedPriceId] = useState<string | null>(null);
  const configured = isPaddleConfigured();

  useEffect(() => {
    const token = getPaddleClientToken();
    if (!token) return;

    let cancelled = false;
    void initializePaddle({
      token,
      environment: getPaddleEnvironment(),
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          setCompletedPriceId(event.data?.items?.[0]?.price_id ?? null);
          setCheckoutCompleted(true);
        }
      },
      checkout: {
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
          // Requires Paddle Dashboard → Checkout → Checkout settings
          // → "Display discount field on the checkout" enabled.
          showAddDiscounts: true,
        },
      },
    }).then((instance) => {
      if (cancelled) return;
      setPaddle(instance);
      setReady(Boolean(instance));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ paddle, ready, configured, checkoutCompleted, completedPriceId }),
    [checkoutCompleted, completedPriceId, configured, paddle, ready],
  );

  return (
    <PaddleContext.Provider value={value}>{children}</PaddleContext.Provider>
  );
}
