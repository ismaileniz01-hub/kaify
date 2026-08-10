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
};

const STRUCTURED_INTENTS: ReadonlySet<Intent> = new Set([
  "meal_analysis",
  "physique_analysis",
  "meal_plan",
  "programming",
  "council_decision",
  "tool_action",
]);

/** Output token budgets by intent class. */
const OUTPUT_BUDGET: Record<Intent, number> = {
  casual: 80,
  motivation: 140,
  hydration: 140,
  nutrition_question: 220,
  exercise_form: 220,
  unknown: 220,
  meal_plan: 400,
  programming: 400,
  council_turn: 400,
  meal_analysis: 650,
  physique_analysis: 650,
  council_decision: 650,
  tool_action: 650,
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
  /\b(motivat|tired|lazy|don't want|dont want|no energy|unmotivated|skip(?:ping)?\s*(?:gym|workout)?|gidesim yok|istemiyorum|üşen|usen|tembell|vazgeç|vazgec|can't today|cant today|salona|quit(?:ting)?(?:\s+training|\s+the\s+gym)?|give up|push me)\b/i;

const FORM_RE =
  /\b(form|technique|cue|rom\b|range of motion|knees?\s+cave|how (?:do|to|deep|far|wide) (?:should |can )?(?:i )?(?:squats?|bench(?:es)?|deadlifts?|press(?:es)?|rows?)|(?:squats?|bench(?:es)?|deadlifts?|press(?:es)?|rows?).{0,24}(?:form|depth|stance|cue|technique|fix)|doğru form|dogru form|teknik|nasıl yapılır|nasil yapilir)\b/i;

const PROGRAM_RE =
  /\b(program|split|mesocycle|periodiz|weekly plan|workout plan|antrenman program|sets?\s*(?:and|&|x)\s*reps?|progress(?:ion|ing)?|deload|push[\s-]?pull[\s-]?legs|\bppl\b|(?:build|create|design|give me|need).{0,48}\b(?:workout|program|split|mesocycle))\b/i;

const NUTRITION_Q_RE =
  /\b(protein|carbs?|calories?|macro|kalori|besin|nutrition|diet|diyet|kilo|bulk|cut|surplus|deficit|ne yesem|kaç kalori|kac kalori)\b/i;

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
      /\bnutrition\b/.test(hints) ||
      /\b(meal|plate|yemek|öğün|ogun)\b/i.test(msg))
  ) {
    return "nutrition_question";
  }

  if (NUTRITION_Q_RE.test(msg) && (input.coach === "maya" || input.coach === "kai")) {
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

  // Short social pings without domain keywords
  if (
    msg.length <= 40 &&
    !NUTRITION_Q_RE.test(msg) &&
    !PROGRAM_RE.test(msg) &&
    !FORM_RE.test(msg) &&
    !MOTIVATION_RE.test(msg)
  ) {
    if (/[?]/.test(msg) && input.coach === "maya") return "nutrition_question";
    if (/[?]/.test(msg) && input.coach === "alex") return "exercise_form";
    return "casual";
  }

  return "unknown";
}

export function needsStructuredOutput(intent: Intent): boolean {
  return STRUCTURED_INTENTS.has(intent);
}

export function outputBudgetFor(intent: Intent): number {
  return OUTPUT_BUDGET[intent] ?? 220;
}
