/** Pixels of the layout viewport covered by the software keyboard. */

export function coveredByKeyboard(pluginHeight = 0): number {
  if (typeof window === "undefined") return Math.max(0, pluginHeight);
  const viewport = window.visualViewport;
  let visual = 0;
  if (viewport) {
    const layoutH = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );
    visual = Math.max(0, layoutH - viewport.height - viewport.offsetTop);
  }
  return Math.max(0, Math.round(Math.max(visual, pluginHeight)));
}

export function applyKeyboardOffset(px: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--keyboard-offset",
    `${Math.max(0, Math.round(px))}px`,
  );
}
