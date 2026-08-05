import { describe, expect, it } from "vitest";
import {
  NATIVE_ENTRY_PATH,
  isWebOnlyPath,
} from "@/lib/native/app-entry";

describe("native consumption-only route policy", () => {
  it("opens native builds at sign-in", () => {
    expect(NATIVE_ENTRY_PATH).toBe("/login");
  });

  it.each(["/", "/signup", "/signup/verify", "/pricing"])(
    "keeps %s on the public website",
    (path) => {
      expect(isWebOnlyPath(path)).toBe(true);
    },
  );

  it.each(["/login", "/welcome", "/settings", "/chat/kai"])(
    "allows %s inside the installed app",
    (path) => {
      expect(isWebOnlyPath(path)).toBe(false);
    },
  );
});
