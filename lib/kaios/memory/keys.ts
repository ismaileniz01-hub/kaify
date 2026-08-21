/**
 * Deterministic key/value facts from a user chat turn.
 * Coaches remember these for MEMORY_TTL_DAYS — not the raw transcript.
 */

import { foldChatMessage } from "@/lib/i18n/fold-diacritics";
import type { StructuredMemoryFact } from "@/lib/kaios/memory/types";

export const MEMORY_TTL_DAYS = 90;

const SKIP_RE =
  /^(?:ok|okay|tamam|tamamdir|evet|hayir|yes|no|yep|yeah|sagol|tesekkur(?:ler)?|thanks|ty|thx|eyvallah|super|harika)[\s!.?…]*$/i;

const MAX_VALUE = 80;

function clip(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= MAX_VALUE) return trimmed;
  return `${trimmed.slice(0, MAX_VALUE - 1).trim()}…`;
}

function push(
  facts: StructuredMemoryFact[],
  seen: Set<string>,
  key: string,
  value: string | undefined | null,
): void {
  if (!value) return;
  const clean = clip(value);
  if (!clean) return;
  if (clean.length < 2 && !/^\d+$/.test(clean)) return;
  if (seen.has(key)) return;
  seen.add(key);
  facts.push({ key, value: clean });
}

/**
 * Extract durable coaching facts from one user message.
 * Returns [] for acks, food logs without constraints, and anything too vague.
 */
export function extractUserMemoryFacts(message: string): StructuredMemoryFact[] {
  const folded = foldChatMessage(message);
  if (!folded || folded.length < 6) return [];
  if (SKIP_RE.test(folded)) return [];

  const facts: StructuredMemoryFact[] = [];
  const seen = new Set<string>();

  const injury =
    folded.match(
      /\b(diz|bel|omuz|bilek|boyun|kalca|sirt|dirsek|knee|back|shoulder|wrist|neck|hip|ankle|elbow)\w*\s+(?:agriyor|agri|aci|pain|hurt|hurts|sakat|injured|injury)\b/,
    ) ??
    folded.match(
      /\b(sakat(?:landim|lik)?|injured|injury)\b.{0,28}?\b(diz|bel|omuz|bilek|boyun|knee|back|shoulder|wrist|neck)\b/,
    ) ??
    folded.match(
      /\b(dizim|belim|omzum|bilegim|boynum)\s+(?:agriyor|cok agriyor|incindi|sakat)\b/,
    );
  if (injury) {
    const part =
      injury[1]?.replace(/im$|um$|üm$/, "") ?? injury[2] ?? injury[0];
    push(facts, seen, "injury", part);
  }

  const allergy =
    folded.match(/\b(?:alerjim var|alerjim|allergic to|allergy to)\s+([a-z0-9çğıöşü\s-]{2,40})/) ??
    folded.match(/\b([a-z0-9çğıöşü-]{2,24})\s+(?:alerjim var|alerjisi|allergy)\b/);
  if (allergy?.[1]) push(facts, seen, "allergy", allergy[1]);

  const dislike = folded.match(
    /\b([a-z0-9çğıöşü][a-z0-9çğıöşü\s-]{1,32}?)\s+(?:sevmiyorum|yemiyorum|yemem|yiyemem|don't like|dont like|can't eat|cant eat)\b/,
  );
  if (dislike?.[1] && !/\b(antrenman|spor|salon|workout|gym|gitmek)\b/.test(dislike[1])) {
    push(facts, seen, "disliked_food", dislike[1]);
  }

  const daysHit = folded.match(/haftada\s+(\d{1,2})/i);
  if (daysHit?.[1]) {
    const n = Number(daysHit[1]);
    if (n >= 1 && n <= 7) push(facts, seen, "training_days", String(n));
  } else {
    const enDays = folded.match(/\b(\d{1,2})\s*days?\s*(?:a|per)\s*week\b/i);
    if (enDays?.[1]) {
      const n = Number(enDays[1]);
      if (n >= 1 && n <= 7) push(facts, seen, "training_days", String(n));
    }
  }

  if (
    /\b(evde calisiyorum|home gym|sadece dambil|sadece dumbbell|no gym|salon yok|ekipmanim yok)\b/.test(
      folded,
    )
  ) {
    push(facts, seen, "equipment", "home / limited");
  } else if (/\b(full gym|salon var|commercial gym)\b/.test(folded)) {
    push(facts, seen, "equipment", "gym");
  }

  if (
    /\b(sabah(?:lari)?|morning).{0,16}(antrenman|workout|train|egzersiz)\b/.test(folded) ||
    /\b(antrenman|workout).{0,16}(sabah|morning)\b/.test(folded)
  ) {
    push(facts, seen, "training_time", "morning");
  } else if (
    /\b(aksam(?:lari)?|evening|night).{0,16}(antrenman|workout|train|egzersiz)\b/.test(
      folded,
    )
  ) {
    push(facts, seen, "training_time", "evening");
  }

  if (
    /\b(yarin (?:mutlaka |kesin )?(?:gidecem|gidecegim|gideceğim|gidicem)|i(?:'ll| will) (?:go|train) tomorrow|soz veriyorum)\b/.test(
      folded,
    )
  ) {
    push(facts, seen, "commitment", "train tomorrow");
  }

  if (
    /\b(?:is|iş|work|mesai|seyahat|travel|sinav|exam|hasta).{0,36}(?:gidemem|gidemiyorum|can't go|cant go|skip)\b/.test(
      folded,
    ) ||
    /\b(?:gidemem|gidemiyorum|can't go|cant go).{0,36}(?:is|iş|work|mesai|seyahat|sinav)\b/.test(
      folded,
    )
  ) {
    push(facts, seen, "schedule_constraint", "busy / travel / exam");
  }

  const sleep = folded.match(
    /\b(\d{1,2})\s*saat\s*uyu(?:dum|yorum)\b|\bslept\s+(\d{1,2})\s*hours?\b|\b(uyuyamadim|insomni|kotu uyudum|bad sleep)\b/,
  );
  if (sleep) {
    push(
      facts,
      seen,
      "sleep",
      sleep[1] || sleep[2] ? `${sleep[1] || sleep[2]}h` : "poor sleep",
    );
  }

  const veg =
    folded.match(/\b(vegan|vejetaryen|vegetarian|pescatarian|keto|halal)\b/);
  if (veg?.[1]) push(facts, seen, "diet_preference", veg[1]);

  return facts;
}
