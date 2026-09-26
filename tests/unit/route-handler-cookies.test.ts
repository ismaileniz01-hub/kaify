import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/supabase/route-handler";

describe("applyAuthCookies", () => {
  it("copies httpOnly, maxAge, and sameSite onto the JSON response", () => {
    const response = NextResponse.json({ ok: true });
    applyAuthCookies(response, [
      {
        name: "sb-access-token",
        value: "tok",
        options: {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 3600,
        },
      },
    ]);

    const cookie = response.cookies.get("sb-access-token");
    expect(cookie?.value).toBe("tok");
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Max-Age=3600/i);
    expect(header).toMatch(/SameSite=Lax/i);
  });
});
