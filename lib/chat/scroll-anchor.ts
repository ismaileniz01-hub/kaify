/** Within this distance of the bottom the thread follows new content. */
export const STICK_TO_BOTTOM_PX = 80;

export function isNearBottom(
  box: { scrollHeight: number; scrollTop: number; clientHeight: number },
  threshold = STICK_TO_BOTTOM_PX,
): boolean {
  return box.scrollHeight - box.scrollTop - box.clientHeight <= threshold;
}
