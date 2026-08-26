/** Client analytics consent for public event beacons. Cookie header is not PII payload. */
export function hasAnalyticsConsentHeader(request: Request): boolean {
  const header = request.headers.get("x-kaify-analytics-consent");
  if (header === "1" || header === "true") return true;
  const cookie = request.headers.get("cookie") ?? "";
  return /kaify_cookie_consent=/.test(cookie) && /accepted/.test(cookie);
}
