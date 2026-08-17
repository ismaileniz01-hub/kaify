import {
  classifyShortTurn,
} from "@/lib/kaios/context/short-turn";
import { looksLikeWorkoutCompletion } from "@/lib/kaios/analytics/workout-log";

/**
 * Deterministic intent routing for KAIOS (no LLM).
 * Heuristics use coach, route/workflow hints, image flag, and keyword/regex cues.
 */

export type CoachId = "alex" | "maya" | "leo" | "kai" | "council";

export type Intent =
  | "casual"
  | "motivation"
  | "exercise_form"
  | "programming"
  | "nutrition_question"
  | "meal_plan"
  | "meal_analysis"
  | "physique_analysis"
  | "hydration"
  | "council_turn"
  | "council_decision"
  | "tool_action"
  | "unknown";

export type ResolveIntentInput = {
  coach: CoachId;
  message: string;
  route?: string;
  hasImage?: boolean;
  workflow?: string;
  /** Last assistant turn — enables elliptical continuation classification. */
  previousAssistantMessage?: string;
  hasRecentHistory?: boolean;
};

const STRUCTURED_INTENTS: ReadonlySet<Intent> = new Set([
  "meal_analysis",
  "physique_analysis",
  "meal_plan",
  "programming",
  "council_decision",
  "tool_action",
]);

/**
 * Output token budgets by conversational need (not a hard 1–3 sentence rule).
 * MICRO ~20–80 · CASUAL ~40–120 · SUPPORT ~60–160 · MEMORY ~60–180 · TASK denser.
 */
const OUTPUT_BUDGET: Record<Intent, number> = {
  casual: 120,
  motivation: 160,
  hydration: 140,
  nutrition_question: 220,
  exercise_form: 240,
  unknown: 180,
  meal_plan: 400,
  programming: 700,
  council_turn: 400,
  meal_analysis: 650,
  physique_analysis: 650,
  council_decision: 650,
  tool_action: 650,
};

/** Finer budgets when message shape is known (used by context builder). */
export type OutputBudgetClass =
  | "micro"
  | "casual"
  | "support"
  | "memory"
  | "detailed";

export function classifyOutputBudget(
  intent: Intent,
  message: string,
): OutputBudgetClass {
  const msg = message.trim();
  if (
    intent === "meal_analysis" ||
    intent === "physique_analysis" ||
    intent === "programming" ||
    intent === "meal_plan" ||
    intent === "council_decision" ||
    intent === "tool_action"
  ) {
    return "detailed";
  }
  if (/\b(hatırlıyor|hatirliyor|remember|geçen|gecen|last week)\b/i.test(msg)) {
    return "memory";
  }
  if (intent === "motivation" || intent === "hydration") return "support";
  if (
    intent === "casual" &&
    msg.length <= 24 &&
    /^(hi|hello|hey|yo|sup|selam|merhaba|sa|naber)/i.test(msg)
  ) {
    return "micro";
  }
  if (intent === "casual" || intent === "unknown") return "casual";
  if (intent === "exercise_form" || intent === "nutrition_question") {
    return "detailed";
  }
  return "casual";
}

const CLASS_BUDGET: Record<OutputBudgetClass, number> = {
  micro: 80,
  casual: 120,
  support: 160,
  memory: 180,
  detailed: 400,
};

const CASUAL_RE =
  /^(?:hi|hello|hey|yo|sup|selam|merhaba|sa|naber|nasılsın|nasilsin|what's up|whats up|günaydın|iyi akşamlar|iyi geceler)(?:[\s,]+(?:hi|hello|hey|yo|sup|selam|merhaba|naber|nasılsın|nasilsin|what's up|whats up|how are you|how're you|naber))?(?:[\s!.?]|$)/i;

function looksCasual(message: string): boolean {
  if (CASUAL_RE.test(message)) return true;
  if (message.length <= 48) {
    return /^(hi|hello|hey|yo|sup|selam|merhaba|naber|sa)\b/i.test(message) &&
      !MOTIVATION_RE.test(message) &&
      !FORM_RE.test(message) &&
      !PROGRAM_RE.test(message) &&
      !NUTRITION_Q_RE.test(message) &&
      !MEAL_PLAN_RE.test(message) &&
      !HYDRATION_RE.test(message) &&
      !TOOL_RE.test(message);
  }
  return false;
}

const MOTIVATION_RE =
  /\b(motivat|tired|lazy|don't want|dont want|no energy|unmotivated|skip(?:ping)?\s*(?:gym|workout)?|gidesim yok|istemiyorum|üşen|usen|tembell|vazgeç|vazgec|can't today|cant today|can't be bothered|cant be bothered|can't be arsed|not in the mood|don't feel like|dont feel like|salona|quit(?:ting)?(?:\s+training|\s+the\s+gym)?|give up|push me|fever|hasta|hastayım|hastayim|injured|injury|sakat)\b/i;

const EASY_SESSION_RE =
  /\b(give me something easy|something easy|easy (?:workout|session|day)|light (?:workout|session|day)|recovery (?:day|session)|kolay antrenman)\b/i;

const FORM_RE =
  /\b(form|technique|cue|rom\b|range of motion|knees?\s+cave|how (?:do|to|deep|far|wide) (?:should |can )?(?:i )?(?:squats?|bench(?:es)?|deadlifts?|press(?:es)?|rows?)|(?:squats?|bench(?:es)?|deadlifts?|press(?:es)?|rows?).{0,24}(?:form|depth|stance|cue|technique|fix)|doğru form|dogru form|teknik|nasıl yapılır|nasil yapilir)\b/i;

const PROGRAM_RE =
  /\b(program|split|mesocycle|periodiz|weekly plan|workout plan|antrenman program|sets?\s*(?:and|&|x)\s*reps?|progress(?:ion|ing)?|deload|push[\s-]?pull[\s-]?legs|\bppl\b|(?:build|create|design|give me|need).{0,48}\b(?:workout|program|split|mesocycle))\b/i;

const NUTRITION_Q_RE =
  /\b(protein|carbs?|calories?|macro|kalori|besin|nutrition|diet|diyet|kilo|bulk|cut|surplus|deficit|ne yesem|kaç kalori|kac kalori)\b/i;

/** User reporting food they ate (slang / short logs) — needs macro headroom, not casual. */
const FOOD_CONSUMPTION_RE =
  /\b(yedim|yuttum|gomdum|gömdüm|gom|i ate|i had|just ate|had a|devoured|scoffed|ate a|ate an|doner|döner|durum|dürüm|wrap|burger|pizza|kebab|lahmacun|pide|tost|sandwich|breakfast|lunch|dinner|brunch|snack|öğün|ogun|yemek yedim|meal i|food log)\b/i;

export function looksLikeFoodConsumption(message: string): boolean {
  return FOOD_CONSUMPTION_RE.test(normalizeMessage(message));
}

const MEAL_PLAN_RE =
  /\b(meal\s*plan|yemek plan|öğün plan|ogun plan|weekly meals|dinners?\s+for\s+the\s+week|weekly\s+dinners?|menu for|hazırla.*plan|hazirla.*plan|plan my (?:dinners?|meals?|lunches?))\b/i;

const HYDRATION_RE =
  /\b(hydrat|water intake|drink water|su iç|su ic|susuz|dehydrat)\b/i;

/** Avoid bare "schedule" — it false-positives programming phrases like "PPL schedule". */
const TOOL_RE =
  /\b(log (?:my )?(?:workout|meal|weight)|set reminder|schedule (?:a |my )?(?:workout|session|reminder|meeting)|kaydet|hatırlat|hatirlat|update (?:my )?(?:goal|weight))\b/i;

const COUNCIL_DECISION_RE =
  /\b(decide|decision|final plan|council decision|karar ver|sonuç|sonuc|oybirliği|oybirligi)\b/i;

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function routeHint(route?: string, workflow?: string): string {
  return `${route ?? ""} ${workflow ?? ""}`.toLowerCase();
}

/**
 * Resolve chat intent with deterministic heuristics only (no model calls).
 */
export function resolveIntent(input: ResolveIntentInput): Intent {
  const msg = normalizeMessage(input.message);
  const hints = routeHint(input.route, input.workflow);
  const lower = msg.toLowerCase();

  // Explicit workflow/route keys win before keyword heuristics.
  if (
    input.workflow === "council_decision" ||
    /\bcouncil[_-]?decision\b/.test(hints)
  ) {
    return "council_decision";
  }
  if (
    input.workflow === "council_turn" ||
    input.workflow === "council" ||
    /\bcouncil[_-]?turn\b/.test(hints)
  ) {
    return "council_turn";
  }

  if (input.coach === "council" || /\bcouncil\b/.test(hints)) {
    if (/\bdecision\b/.test(hints) || COUNCIL_DECISION_RE.test(msg)) {
      return "council_decision";
    }
    return "council_turn";
  }

  if (input.hasImage || /\bvision\b|\bimage\b|\bphoto\b/.test(hints)) {
    if (input.coach === "maya" || /\bmeal\b|\bfood\b/.test(hints)) {
      return "meal_analysis";
    }
    if (input.coach === "leo" || /\bphysique\b|\bbody\b|\bposture\b/.test(hints)) {
      return "physique_analysis";
    }
    // Image without a clear coach: prefer maya for food-ish, else physique.
    if (/\b(food|meal|yemek|plate)\b/i.test(msg)) return "meal_analysis";
    return "physique_analysis";
  }

  if (/\btool_action\b|\btool\b/.test(hints) || TOOL_RE.test(msg)) {
    return "tool_action";
  }

  if (msg.length === 0) return "unknown";

  // Finished-session logs are celebration + analytics, never a new program JSON.
  if (input.coach === "alex" && looksLikeWorkoutCompletion(msg)) {
    return "motivation";
  }

  // Elliptical replies after a prior proposal are NOT standalone casual.
  const shortTurn = classifyShortTurn({
    message: msg,
    previousAssistantMessage: input.previousAssistantMessage,
    hasRecentHistory: input.hasRecentHistory,
  });
  if (shortTurn.needsContinuation && shortTurn.continuePreviousTopic) {
    return "unknown";
  }

  if (looksCasual(msg)) {
    return "casual";
  }

  if (MEAL_PLAN_RE.test(msg) || /\bmeal_plan\b/.test(hints)) {
    return "meal_plan";
  }

  // Programming before form/motivation so progression + timeframe and
  // "tired but build me a workout" prefer programming for Alex.
  if (PROGRAM_RE.test(msg) || /\bprogramming\b/.test(hints)) {
    return "programming";
  }

  // Alex: tired + request for an easy session is programming, not pep talk.
  if (input.coach === "alex" && EASY_SESSION_RE.test(msg)) {
    return "programming";
  }

  if (FORM_RE.test(msg) || /\bexercise_form\b/.test(hints)) {
    return "exercise_form";
  }

  if (HYDRATION_RE.test(msg) || /\bhydration\b/.test(hints)) {
    return "hydration";
  }

  if (MOTIVATION_RE.test(msg) || /\bmotivation\b/.test(hints)) {
    return "motivation";
  }

  if (
    input.coach === "maya" &&
    (NUTRITION_Q_RE.test(msg) ||
      looksLikeFoodConsumption(msg) ||
      /\bnutrition\b/.test(hints) ||
      /\b(meal|plate|yemek|öğün|ogun)\b/i.test(msg))
  ) {
    return "nutrition_question";
  }

  if (
    (NUTRITION_Q_RE.test(msg) || looksLikeFoodConsumption(msg)) &&
    (input.coach === "maya" || input.coach === "kai")
  ) {
    return "nutrition_question";
  }

  // Coach-biased fallbacks when keywords are weak.
  // Lift questions (with '?') are form/technique by default; program requests
  // already matched PROGRAM_RE above. Plurals: squats/benches/deadlifts.
  if (
    input.coach === "alex" &&
    /\b(workout|lift|squats?|benchs?|benches|deadlifts?|gym|antrenman)\b/i.test(lower)
  ) {
    if (FORM_RE.test(msg) || /[?]/.test(msg)) return "exercise_form";
    return "programming";
  }
  if (input.coach === "maya" && NUTRITION_Q_RE.test(msg)) {
    return "nutrition_question";
  }

  // Short social pings without domain keywords.
  // Bare "nasıl?" / "how?" is a follow-up, not a greeting — keep unknown so
  // context tier can attach recent history (casual is tier 0 / no history).
  if (
    msg.length <= 40 &&
    !NUTRITION_Q_RE.test(msg) &&
    !PROGRAM_RE.test(msg) &&
    !FORM_RE.test(msg) &&
    !MOTIVATION_RE.test(msg)
  ) {
    if (/[?]/.test(msg) && input.coach === "maya") return "nutrition_question";
    if (/[?]/.test(msg) && input.coach === "alex") return "exercise_form";
    if (/[?]/.test(msg) && !looksCasual(msg)) return "unknown";
    return "casual";
  }

  return "unknown";
}

export function needsStructuredOutput(intent: Intent): boolean {
  return STRUCTURED_INTENTS.has(intent);
}

export function outputBudgetFor(
  intent: Intent,
  message?: string,
  options?: { needsContinuation?: boolean },
): number {
  let budget: number;
  if (message != null && message.length > 0) {
    const cls = classifyOutputBudget(intent, message);
    // Structured intents keep their higher ceiling.
    if (
      intent === "meal_analysis" ||
      intent === "physique_analysis" ||
      intent === "council_decision" ||
      intent === "tool_action"
    ) {
      budget = OUTPUT_BUDGET[intent];
    } else if (
      intent === "programming" ||
      intent === "meal_plan" ||
      intent === "council_turn"
    ) {
      budget = Math.max(CLASS_BUDGET[cls], OUTPUT_BUDGET[intent]);
    } else {
      budget = CLASS_BUDGET[cls];
    }
  } else {
    budget = OUTPUT_BUDGET[intent] ?? 220;
  }
  // Short elliptical replies often need MORE completion room than long ones.
  if (options?.needsContinuation) {
    budget = Math.max(budget, CLASS_BUDGET.support);
    if (intent === "unknown" || intent === "casual" || intent === "motivation") {
      budget = Math.max(budget, 200);
    }
  }
  return budget;
}
