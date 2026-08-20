/**
 * Action truth contract — backend/tool success is the only SUCCEEDED authority.
 * Prompt bans alone are insufficient; structured state + light prose guard.
 */

export type ActionLifecycle =
  | "PROPOSED"
  | "PENDING_CONFIRMATION"
  | "EXECUTING"
  | "SUCCEEDED"
  | "FAILED"
  | "UNSUPPORTED";

export type ActionTruthRecord = {
  status: ActionLifecycle;
  tool?: string;
  code?: string;
  message?: string;
  data?: unknown;
};

const SUCCESS_BOOL_KEYS = [
  "saved",
  "applied",
  "logged",
  "updated",
  "added",
  "succeeded",
] as const;

const WRITE_SUCCESS_TOOLS = new Set([
  "saveMealMacros",
  "recordHydration",
  "logWorkout",
]);

function hasWriteSuccess(truths: ActionTruthRecord[]): boolean {
  return truths.some(
    (t) =>
      t.status === "SUCCEEDED" &&
      typeof t.tool === "string" &&
      WRITE_SUCCESS_TOOLS.has(t.tool),
  );
}

/**
 * Strip machine success flags unless lifecycle is SUCCEEDED.
 * PENDING_CONFIRMATION forces saved=false when present.
 */
export function enforceActionTruthOnPayload(
  payload: Record<string, unknown> | null,
  truths: ActionTruthRecord[],
): Record<string, unknown> | null {
  if (!payload) return payload;
  const hasSucceeded = hasWriteSuccess(truths);
  const hasPending = truths.some((t) => t.status === "PENDING_CONFIRMATION");
  const next: Record<string, unknown> = { ...payload };

  next.action_truth = truths.map((t) => ({
    status: t.status,
    tool: t.tool,
    code: t.code,
    message: t.message,
  }));

  const scrubObject = (obj: Record<string, unknown>) => {
    for (const key of SUCCESS_BOOL_KEYS) {
      if (obj[key] === true && !hasSucceeded) {
        obj[key] = false;
      }
    }
    if (hasPending && "saved" in obj) obj.saved = false;
    if (!hasSucceeded && obj.status === "applied") {
      obj.status = "proposed";
    }
    if (
      typeof obj.status === "string" &&
      /^(applied|saved|logged|updated)$/i.test(obj.status) &&
      !hasSucceeded
    ) {
      obj.status = hasPending ? "pending_confirmation" : "proposed";
    }
  };

  scrubObject(next);
  if (next.data && typeof next.data === "object" && !Array.isArray(next.data)) {
    scrubObject(next.data as Record<string, unknown>);
  }
  if (next.ui && typeof next.ui === "object" && !Array.isArray(next.ui)) {
    scrubObject(next.ui as Record<string, unknown>);
  }
  if (next.meta && typeof next.meta === "object" && !Array.isArray(next.meta)) {
    scrubObject(next.meta as Record<string, unknown>);
  }

  return next;
}

/**
 * Conservative prose guard for known success claims when no SUCCEEDED action.
 * Intentionally narrow — not a full semantic NL police.
 * Always applies when there is no SUCCEEDED tool result (integrity closure).
 */
export function scrubFalseSuccessClaims(
  message: string,
  truths: ActionTruthRecord[],
): string {
  const hasSucceeded = hasWriteSuccess(truths);
  if (hasSucceeded || !message.trim()) return message;

  const hasPending = truths.some((t) => t.status === "PENDING_CONFIRMATION");

  let out = message;
  const replacements: Array<[RegExp, string]> = [
    [
      /\b(done[!.]?\s*)?(i('|’)ve|i have|we('|’)ve|we have)\s+(saved|logged|applied|updated)\b/gi,
      hasPending
        ? "I've prepared that for your confirmation — not saved yet"
        : "I can propose that, but I haven't applied it yet",
    ],
    [
      /\b(kaydettim|kaydedildi|uyguladım|uyguladim|programa ekledim)\b/gi,
      hasPending
        ? "onayına hazırladım — henüz kaydedilmedi"
        : "önerebilirim ama henüz uygulamadım",
    ],
    [
      /\b(program(ın|iniz|ınız)?\s+(güncellendi|uygulandı|uygulandi))\b/gi,
      "program önerisi hazır — henüz uygulanmadı",
    ],
    [
      /\b(your program (has been |was )?(updated|applied|changed))\b/gi,
      "I can suggest that program change, but it hasn't been applied yet",
    ],
    [
      /\b(meal (has been |was )?saved|macros? (have been |were )?saved|logged (your )?meal)\b/gi,
      hasPending
        ? "meal is ready for confirmation — not saved yet"
        : "I can propose saving those macros, but they aren't saved yet",
    ],
  ];

  for (const [re, replacement] of replacements) {
    out = out.replace(re, replacement);
  }
  return out;
}

export function actionTruthHintForPrompt(): string {
  return [
    "ACTION_TRUTH:",
    "- Never claim saved/logged/applied/updated unless a tool result with status SUCCEEDED is present in TOOL_RESULTS.",
    "- If no tool ran: present changes as PROPOSED only.",
    "- Pending confirmation means saved=false until the user confirms in the app.",
    "- If a tool failed: do not name codes, tools, or TOOL_RESULTS; ask them to say it again.",
  ].join("\n");
}
