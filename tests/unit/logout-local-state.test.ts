import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/kai-context", () => ({
  clearKaiLocalCache: () => undefined,
}));
vi.mock("@/lib/push/native-token-store", () => ({
  clearStoredNativeToken: () => undefined,
}));
vi.mock("@/lib/supabase/client", () => ({
  tryCreateBrowserSupabaseClient: () => null,
}));

import { clearAuthLocalState } from "@/lib/auth/logout";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

describe("clearAuthLocalState", () => {
  beforeEach(() => {
    const session = memoryStorage();
    const local = memoryStorage();
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("window", {
      sessionStorage: session,
      localStorage: local,
    });
    session.setItem(
      "kaify:analytics:v2",
      JSON.stringify({ savedAt: Date.now(), data: { today: {} } }),
    );
    local.setItem("streak_claimed_milestones", "[1]");
    local.setItem("streak_claimed_stations", "[2]");
  });

  it("drops analytics cache and streak claim flags", () => {
    clearAuthLocalState();
    expect(sessionStorage.getItem("kaify:analytics:v2")).toBeNull();
    expect(localStorage.getItem("streak_claimed_milestones")).toBeNull();
    expect(localStorage.getItem("streak_claimed_stations")).toBeNull();
  });
});
