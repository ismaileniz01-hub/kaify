import { NATIVE_CLIENT_VERSION } from "./client-version";

export const NATIVE_CONSUME_PATH = "/api/auth/session/native-consume";
export const NATIVE_TICKET_PATH = "/api/auth/session/native-ticket";

function hashHandoffUrl(accessToken: string, refreshToken: string): string {
  const hash = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
  }).toString();
  return `${__KAIFY_API_BASE__}/login/native-entry#${hash}`;
}

export function nativeConsumeUrl(ticket: string): string {
  return `${__KAIFY_API_BASE__}${NATIVE_CONSUME_PATH}?ticket=${encodeURIComponent(ticket)}`;
}

async function mintHandoffTicket(
  accessToken: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${__KAIFY_API_BASE__}${NATIVE_TICKET_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Version": NATIVE_CLIENT_VERSION,
      },
      body: JSON.stringify({ accessToken, refreshToken }),
    });
    const payload = (await response.json()) as {
      success?: boolean;
      data?: { ticket?: string };
    };
    const ticket = payload.data?.ticket?.trim() ?? "";
    return response.ok && payload.success === true && ticket ? ticket : null;
  } catch {
    return null;
  }
}

/**
 * After OTP, open Kaify with a first-party document GET.
 * The ticket is minted by verify (or here for returning users). Hash
 * native-entry remains only if ticket minting fails.
 */
export function enterRealKaify(
  accessToken: string,
  refreshToken: string,
  handoffTicket?: string,
): void {
  const ticket = handoffTicket?.trim() ?? "";
  if (ticket) {
    globalThis.location.assign(nativeConsumeUrl(ticket));
    return;
  }
  void mintHandoffTicket(accessToken, refreshToken).then((minted) => {
    globalThis.location.assign(
      minted ? nativeConsumeUrl(minted) : hashHandoffUrl(accessToken, refreshToken),
    );
  });
}
