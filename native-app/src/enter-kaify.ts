export function enterRealKaify(accessToken: string, refreshToken: string): void {
  const hash = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
  }).toString();
  globalThis.location.assign(`${__KAIFY_API_BASE__}/login/native-entry#${hash}`);
}
