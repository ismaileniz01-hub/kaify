/**
 * Maya must not park training for "later" — send them to Alex.
 */

const SPORT_RE =
  /\b(spor(?:u|a|da)?|antrenman(?:dan|ı|i|lar[ıi]?)?|egzersiz(?:i|e)?|workout|gym|salon|idman|cardio|kardiyo)\b/i;
const DEFER_RE =
  /sporu?\s+sonra|antrenman[ıi]?\s+sonra|sonra\s+konu[sş]|later.{0,28}(?:train|workout|sport)|we['’]?ll\s+(?:talk|do).{0,20}(?:later|after)/i;
const ALEX_RE = /\balex\b/i;

const HANDOFF: Record<string, string> = {
  tr: "Antrenmanı Alex ile konuş — ona geç: /chat/alex",
  en: "Talk training with Alex — go to /chat/alex",
  de: "Training klärst du mit Alex — geh zu /chat/alex",
};

function localePrefix(locale: string): string {
  const prefix = locale.trim().toLowerCase().split(/[-_]/)[0] ?? "en";
  return prefix in HANDOFF ? prefix : "en";
}

export function mentionsTrainingAsk(message: string): boolean {
  return SPORT_RE.test(message);
}

export function defersTraining(text: string): boolean {
  return DEFER_RE.test(text);
}

export function ensureMayaAlexHandoff(input: {
  text: string;
  locale: string;
  coachId: string;
  userMessage?: string;
}): string {
  if (input.coachId !== "maya") return input.text;
  const text = input.text.trim();
  if (!text) return input.text;
  const userAsked = mentionsTrainingAsk(input.userMessage ?? "");
  if (!userAsked && !defersTraining(text)) return input.text;
  if (ALEX_RE.test(text)) return input.text;
  return `${text}\n\n${HANDOFF[localePrefix(input.locale)] ?? HANDOFF.en}`;
}
