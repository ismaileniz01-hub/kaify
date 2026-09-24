import { NATIVE_CLIENT_VERSION } from "./client-version";

export const NATIVE_CONSUME_PATH = "/api/auth/session/native-consume";
export const NATIVE_TICKET_PATH = "/api/auth/session/native-ticket";

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

export type EnterKaifyResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * After OTP/password, open Kaify with a first-party document GET.
 * Ticket-only — never hash native-entry (WKWebView drops Location fragments).
 * Same path on iOS and Android once both shells use https://localhost.
 */
export async function enterRealKaify(
  accessToken: string,
  refreshToken: string,
  handoffTicket?: string,
): Promise<EnterKaifyResult> {
  let ticket = handoffTicket?.trim() ?? "";
  if (!ticket) {
    ticket = (await mintHandoffTicket(accessToken, refreshToken)) ?? "";
  }
  if (!ticket) {
    return {
      ok: false,
      message:
        "Giriş tamamlandı ama oturum aktarılamadı. İnternetini kontrol edip tekrar dene.",
    };
  }
  globalThis.location.assign(nativeConsumeUrl(ticket));
  return { ok: true };
}
