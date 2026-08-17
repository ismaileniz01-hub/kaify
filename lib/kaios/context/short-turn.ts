/**
 * Locale-independent short-turn continuation.
 * Structure + previous dialogue state drive behavior; phrase lists are fixtures only.
 */

export type ShortTurnFunction =
  | "GREETING"
  | "HESITATION"
  | "AMBIVALENCE"
  | "REJECTION"
  | "PARTIAL_AGREEMENT"
  | "FRUSTRATION"
  | "CALLBACK"
  | "CONTINUATION"
  | "CONFIRMATION"
  | "DISENGAGEMENT"
  | "UNCERTAINTY"
  | "STANDALONE";

export type ShortTurnClassification = {
  function: ShortTurnFunction;
  needsContinuation: boolean;
  continuePreviousTopic: boolean;
  resetConversation: boolean;
  /** Max recent turns to keep (1–3). */
  recentTurnBudget: number;
};

/** High-confidence elliptical markers (boosters only — not the architecture). */
const ELLIPTICAL_BOOSTERS =
  /^(?:bilmiyorum|bilemedim|emin değilim|emin degilim|olmaz|belki|boşver|bosver|neyse|zor|istemiyorum|istemem|yapamam|olmaz ya|i don'?t know|i dont know|idk|dunno|maybe|nah|nope|forget it|not sure|i can'?t|cant|don'?t want|dont want|weiß nicht|weiss nicht|vielleicht|nee|lass mal|keine ahnung|geht nicht|will nicht|je sais pas|j'sais pas|peut-être|peut-etre|bof|laisse tomber|pas sûr|pas sur|j'ai pas envie|no sé|no se|quizá|quiza|déjalo|dejalo|no estoy seguro|no quiero|non lo so|boh|forse|lascia stare|non sono sicuro|non voglio|ما أدري|ما ادري|مش عارف|مش عارفة|يمكن|خلاص|ما أبغى|ما ابغى|لا أريد|لا اريد|مش عايز|مقدرش)[\s!.?…]*$/iu;

const CONFIRM_BOOSTERS =
  /^(?:ok|okay|tamam|evet|yes|yep|yeah|sí|si|ja|oui|va bene|تمام|أوكي|اوكي|sure|olur|yapalım|yapalim|let'?s go|do it|dale)[\s!.?…]*$/iu;

const REJECT_BOOSTERS =
  /^(?:no|nope|nah|hayır|hayir|olmaz|yok|nee|non|لا|never|asla)[\s!.?…]*$/iu;

const DISENGAGE_BOOSTERS =
  /^(?:boşver|bosver|forget it|laisse tomber|déjalo|dejalo|lascia stare|lass mal|خلاص|neyse)[\s!.?…]*$/iu;

const GREETING_RE =
  /^(?:hi|hello|hey|yo|sup|selam|merhaba|sa|naber|günaydın|iyi akşamlar|iyi geceler|what's up|whats up|hallo|salut|hola|ciao|مرحبا|أهلا)(?:[\s,!.?]|$)/iu;

/**
 * Previous assistant turn looks like a proposal, offer, question, or coaching nudge.
 * Language-agnostic structural cues (not a phrase dictionary).
 */
export function looksLikePriorProposalOrQuestion(
  previousAssistant?: string | null,
): boolean {
  const prev = (previousAssistant ?? "").trim();
  if (!prev) return false;
  if (prev.length < 8) return false;
  if (/[?؟]\s*$/u.test(prev)) return true;
  // Imperative / offer shape: short paragraphs with action pressure are common.
  if (prev.length <= 280) return true;
  // Longer coach turn still usually expects a reaction.
  return prev.length <= 600;
}

/** Prior Kai turn was pushing gym / minimum workout / training action. */
export function looksLikeFitnessCoachingProposal(
  previousAssistant?: string | null,
): boolean {
  const prev = (previousAssistant ?? "").trim();
  if (!prev) return false;
  return /\b(gym|workout|train|spor|salon|antrenman|minutes?|dakika|minute|hareket|move|adım|step|push|git|go\b|minimum|deneme|try|versuch|essai|prueba|prova|جرّب|دقيقة)\b/iu.test(
    prev,
  );
}

function wordLikeCount(message: string): number {
  const parts = message
    .trim()
    .split(/[\s,.;:!?…]+/u)
    .filter(Boolean);
  return parts.length;
}

function isElliptical(message: string): boolean {
  const msg = message.trim();
  if (!msg) return true;
  if (msg.length <= 48 && wordLikeCount(msg) <= 6) return true;
  if (ELLIPTICAL_BOOSTERS.test(msg)) return true;
  if (CONFIRM_BOOSTERS.test(msg) || REJECT_BOOSTERS.test(msg)) return true;
  if (DISENGAGE_BOOSTERS.test(msg)) return true;
  return false;
}

function classifyFunction(message: string): ShortTurnFunction {
  const msg = message.trim();
  if (!msg) return "STANDALONE";
  if (GREETING_RE.test(msg) && wordLikeCount(msg) <= 4) return "GREETING";
  // Ambivalence / uncertainty phrases before bare reject tokens ("no" ⊂ "no sé").
  if (ELLIPTICAL_BOOSTERS.test(msg)) {
    if (/maybe|belki|vielleicht|peut|quiz|forse|يمكن|idk|don'?t know|bilmiyorum|weiß nicht|weiss nicht|no sé|no se|non lo so|ما أدري|مش عارف|pas sûr|pas sur|not sure|emin/iu.test(msg)) {
      return "AMBIVALENCE";
    }
    if (/zor|can'?t|cant|geht nicht|yapamam|مقدرش/iu.test(msg)) {
      return "HESITATION";
    }
    return "UNCERTAINTY";
  }
  if (DISENGAGE_BOOSTERS.test(msg)) return "DISENGAGEMENT";
  if (REJECT_BOOSTERS.test(msg)) return "REJECTION";
  if (CONFIRM_BOOSTERS.test(msg)) return "CONFIRMATION";
  if (isElliptical(msg)) return "CONTINUATION";
  return "STANDALONE";
}

/**
 * Classify whether the current short/elliptical turn needs prior dialogue.
 */
export function classifyShortTurn(input: {
  message: string;
  previousAssistantMessage?: string | null;
  hasRecentHistory?: boolean;
}): ShortTurnClassification {
  const msg = input.message.trim();
  const fn = classifyFunction(msg);
  const priorProposal = looksLikePriorProposalOrQuestion(
    input.previousAssistantMessage,
  );
  const hasHistory = Boolean(
    input.hasRecentHistory || input.previousAssistantMessage?.trim(),
  );

  if (fn === "GREETING" && !priorProposal) {
    return {
      function: fn,
      needsContinuation: false,
      continuePreviousTopic: false,
      resetConversation: false,
      recentTurnBudget: 0,
    };
  }

  // Prefer ambivalence markers over bare "no" when phrase is in elliptical list.
  // (classifyFunction already orders reject before elliptical; "no sé" is elliptical.)

  // Structural rule: elliptical reply after a proposal/question MUST continue.
  if (hasHistory && priorProposal && isElliptical(msg) && fn !== "GREETING") {
    return {
      function: fn === "STANDALONE" ? "CONTINUATION" : fn,
      needsContinuation: true,
      continuePreviousTopic: true,
      resetConversation: false,
      recentTurnBudget: 3,
    };
  }

  // Elliptical with any recent history — prefer continuation over reset.
  if (hasHistory && isElliptical(msg) && fn !== "GREETING") {
    return {
      function: fn === "STANDALONE" ? "CONTINUATION" : fn,
      needsContinuation: true,
      continuePreviousTopic: true,
      resetConversation: false,
      recentTurnBudget: 2,
    };
  }

  if (hasHistory && (fn === "CALLBACK" || fn === "CONTINUATION")) {
    return {
      function: fn,
      needsContinuation: true,
      continuePreviousTopic: true,
      resetConversation: false,
      recentTurnBudget: 3,
    };
  }

  return {
    function: fn === "CONTINUATION" ? "STANDALONE" : fn,
    needsContinuation: false,
    continuePreviousTopic: false,
    resetConversation: false,
    recentTurnBudget: 0,
  };
}

export function lastAssistantMessage(
  turns?: Array<{ role: string; content: string }> | null,
): string | null {
  if (!turns?.length) return null;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i];
    if (t && (t.role === "assistant" || t.role === "coach") && t.content?.trim()) {
      return t.content.trim();
    }
  }
  return null;
}

/** Prompt hint injected when continuation is required (locale-neutral). */
export function continuationHint(
  classification: ShortTurnClassification,
  previousAssistant?: string | null,
): string {
  if (!classification.needsContinuation) return "";
  const coachingCtx = looksLikeFitnessCoachingProposal(previousAssistant);
  const ambivalent = [
    "AMBIVALENCE",
    "HESITATION",
    "UNCERTAINTY",
    "REJECTION",
    "CONTINUATION",
  ].includes(classification.function);
  const lines = [
    "turn.continuation:",
    `  user_function: ${classification.function}`,
    "  continue_previous_topic: true",
    "  reset_conversation: false",
    "  ban_topic_reset_questions: true",
    "  interpret_elliptical_reply_against_last_assistant_turn: true",
    "  if_previous_was_a_proposal: address hesitation/resistance about THAT proposal",
    "  do_not_ask_what_they_are_curious_about",
    "  complete_sentences: true — never trail off mid-thought",
  ];
  if (coachingCtx && ambivalent) {
    lines.push(
      "  coaching_thread: fitness/minimum-action — user is NOT sick unless USER_CONTEXT says so",
      "  on_first_hesitation: stay motivating — shrink the ask, light tease, remind real goals from USER_CONTEXT when present",
      "  do_not_defer_sport_to_later: true unless illness/injury or user explicitly opts out of coaching",
      "  do_not_switch_to_feelings_therapy_mode: acknowledge briefly then re-anchor to the proposed minimum action",
    );
  }
  return lines.join("\n");
}
