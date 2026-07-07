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
};

const PaddleContext = createContext<PaddleContextValue>({
  paddle: undefined,
  ready: false,
  configured: false,
});

export function usePaddle(): PaddleContextValue {
  return useContext(PaddleContext);
}

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [ready, setReady] = useState(false);
  const configured = isPaddleConfigured();

  useEffect(() => {
    const token = getPaddleClientToken();
    if (!token) return;

    let cancelled = false;
    void initializePaddle({
      token,
      environment: getPaddleEnvironment(),
      checkout: {
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
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
    () => ({ paddle, ready, configured }),
    [paddle, ready, configured],
  );

  return (
    <PaddleContext.Provider value={value}>{children}</PaddleContext.Provider>
  );
}
