export type ChatGroupPosition = {
  /** First message of a run from the same sender (gets group spacing above). */
  first: boolean;
  /** Last message of the run (shows the avatar and the bubble tail). */
  last: boolean;
};

/** Consecutive messages from the same sender form one visual group. */
export function chatGroupPosition<T extends { from: string }>(
  messages: readonly T[],
  index: number,
): ChatGroupPosition {
  const current = messages[index];
  if (!current) return { first: true, last: true };
  const previous = messages[index - 1];
  const next = messages[index + 1];
  return {
    first: !previous || previous.from !== current.from,
    last: !next || next.from !== current.from,
  };
}

const TAIL_RADIUS = "6px";
const RADIUS = "18px";

/** Bubble corners: the tail corner points at the avatar on the group's last bubble. */
export function chatBubbleRadius(side: "coach" | "user", last: boolean): string {
  if (!last) return RADIUS;
  return side === "coach"
    ? `${RADIUS} ${RADIUS} ${RADIUS} ${TAIL_RADIUS}`
    : `${RADIUS} ${RADIUS} ${TAIL_RADIUS} ${RADIUS}`;
}
