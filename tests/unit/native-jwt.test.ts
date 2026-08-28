import { describe, expect, it } from "vitest";
import { decodeJwtPayload, userFromAccessToken } from "../../native-app/src/jwt";

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("native JWT helpers", () => {
  it("builds a GoTrue user from an access token payload", () => {
    const token = fakeJwt({
      sub: "user-1",
      email: "a@example.com",
      role: "authenticated",
      aud: "authenticated",
    });
    expect(decodeJwtPayload(token)?.sub).toBe("user-1");
    const user = userFromAccessToken(token);
    expect(user).toMatchObject({
      id: "user-1",
      email: "a@example.com",
      role: "authenticated",
    });
  });

  it("returns null for garbage tokens", () => {
    expect(userFromAccessToken("not-a-jwt")).toBeNull();
  });
});
