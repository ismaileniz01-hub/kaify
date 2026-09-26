"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";

type Theme = "dark" | "light";

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("kaify-theme");
  return saved === "light" || saved === "dark" ? saved : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const next = readStoredTheme();
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
    return next;
  });

  useEffect(() => {
    localStorage.setItem("kaify-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const setThemeStable = useCallback((t: Theme) => setTheme(t), []);

  const value = useMemo<ThemeContextType>(
    () => ({ theme, setTheme: setThemeStable, toggleTheme }),
    [theme, setThemeStable, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
