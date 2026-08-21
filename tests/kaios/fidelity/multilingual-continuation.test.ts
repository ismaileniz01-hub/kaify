/**
 * Multilingual short-turn continuation + personality parity contracts.
 * Semantic behavior only — not exact wording.
 */

import { describe, expect, it } from "vitest";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import {
  classifyShortTurn,
  continuationHint,
} from "@/lib/kaios/context/short-turn";
import { resolveIntent, outputBudgetFor } from "@/lib/kaios/routing/intent";
import {
  isNonSwitchingExpression,
  resolveActiveLocale,
} from "@/lib/kaios/localization/resolve";
import { selectKaiCapsules } from "@/lib/kaios/capsules/kai";
import { getLocalePack } from "@/lib/kaios/capsules/localization";
import {
  hasBrokenUtf16,
  isStreamCompletionSuspicious,
} from "@/lib/kaios/stream/unicode";
import { gymSkipFacts } from "@/lib/ai/count-consecutive-rest-days";

const SUPPORTED_LOCALES = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "es-MX",
  "es-AR",
  "it",
  "ar",
] as const;

const FIVE_MIN_PROPOSALS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: "Try five minutes. Just get moving — that is enough for today.",
  tr: "Beş dakika dene. Sadece hareket et — bugünlük yeter.",
  de: "Versuch nur fünf Minuten. Einfach anfangen — das reicht für heute.",
  fr: "Essaie juste cinq minutes. Bouge un peu — ça suffit pour aujourd'hui.",
  es: "Haz solo cinco minutos. Muévete un poco — basta por hoy.",
  "es-MX": "Haz solo cinco minutos. Muévete un poco — basta por hoy.",
  "es-AR": "Hacé solo cinco minutos. Movete un toque — alcanza por hoy.",
  it: "Prova solo cinque minuti. Muoviti un po' — basta per oggi.",
  ar: "جرّب خمس دقائق فقط. تحرّك قليلاً — يكفي لليوم.",
};

/** Ambivalence fixtures for cross-locale parity (same semantic function). */
const AMBIVALENCE_MSG: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: "I don't know",
  tr: "bilmiyorum",
  de: "weiß nicht",
  fr: "je sais pas",
  es: "no sé",
  "es-MX": "no sé",
  "es-AR": "no sé",
  it: "non lo so",
  ar: "ما أدري",
};

const REJECTION_MSG: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: "nah",
  tr: "olmaz",
  de: "nee",
  fr: "non",
  es: "no",
  "es-MX": "no",
  "es-AR": "no",
  it: "no",
  ar: "لا",
};

const UNCERTAINTY_MSG: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: "not sure",
  tr: "emin değilim",
  de: "keine Ahnung",
  fr: "pas sûr",
  es: "no estoy seguro",
  "es-MX": "no estoy seguro",
  "es-AR": "no estoy seguro",
  it: "non sono sicuro",
  ar: "مش عارف",
};

const AGREE_MSG: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: "ok",
  tr: "tamam",
  de: "ja",
  fr: "oui",
  es: "sí",
  "es-MX": "sí",
  "es-AR": "dale",
  it: "va bene",
  ar: "تمام",
};

const MATRIX_SCENARIOS = [
  "A_hesitation",
  "B_rejection",
  "C_uncertainty",
  "D_short_agreement",
  "E_callback",
  "F_language_switch",
  "G_short_ack_no_switch",
  "H_ordinary_laziness",
  "I_illness",
  "J_just_talk",
] as const;

function turnsAfterProposal(locale: (typeof SUPPORTED_LOCALES)[number]) {
  return [
    { role: "user" as const, content: "gym?" },
    {
      role: "assistant" as const,
      content: FIVE_MIN_PROPOSALS[locale],
    },
  ];
}

function promptInspection(locale: string, message: string) {
  const turns = [
    { role: "user" as const, content: "…" },
    {
      role: "assistant" as const,
      content: FIVE_MIN_PROPOSALS[(locale in FIVE_MIN_PROPOSALS
        ? locale
        : "en") as (typeof SUPPORTED_LOCALES)[number]],
    },
  ];
  const ctx = buildRuntimeContext({
    coach: "kai",
    message,
    locale,
    conversationTurns: turns,
    userState: "canonical: consecutive days without gym: 3 (source: TRUSTED_ANALYTICS)",
    memoryItems: ["trusted: prefers evening workouts"],
  });
  const compiled = compilePrompt(ctx);
  const blob = compiled.messages.map((m) => m.content).join("\n");
  return { ctx, blob, estimatedInputTokens: ctx.breakdown.total };
}

describe("KAI short-turn continuity — all locales", () => {
  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale}: ambivalence after proposal continues topic`, () => {
      const msg = AMBIVALENCE_MSG[locale];
      const prev = FIVE_MIN_PROPOSALS[locale];
      const c = classifyShortTurn({
        message: msg,
        previousAssistantMessage: prev,
        hasRecentHistory: true,
      });
      expect(c.continuePreviousTopic).toBe(true);
      expect(c.resetConversation).toBe(false);
      expect(c.needsContinuation).toBe(true);
      expect(["AMBIVALENCE", "UNCERTAINTY", "CONTINUATION", "HESITATION", "REJECTION"]).toContain(
        c.function,
      );
    });
  }
});

describe("KAI ambivalence handling — cross-locale parity", () => {
  it("same semantic fixture → CONTINUE + AMBIVALENT family + no reset", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const c = classifyShortTurn({
        message: AMBIVALENCE_MSG[locale],
        previousAssistantMessage: FIVE_MIN_PROPOSALS[locale],
        hasRecentHistory: true,
      });
      expect(c.continuePreviousTopic, locale).toBe(true);
      expect(c.resetConversation, locale).toBe(false);
      expect(
        ["AMBIVALENCE", "UNCERTAINTY", "HESITATION", "CONTINUATION", "REJECTION"],
        locale,
      ).toContain(c.function);
    }
  });
});

describe("KAI context reset regression", () => {
  for (const locale of ["tr", "en", "de", "es", "ar"] as const) {
    it(`${locale}: prompt bans help-desk reset + includes continuation`, () => {
      const { blob, ctx } = promptInspection(locale, AMBIVALENCE_MSG[locale]);
      expect(ctx.conversationTurns?.length ?? 0).toBeGreaterThan(0);
      expect(blob).toMatch(/continue_previous_topic:\s*true/);
      expect(blob).toMatch(/reset_conversation:\s*false|ban_topic_reset/i);
      expect(blob).toContain("kai.mode.continuation");
      expect(blob).not.toMatch(/FULL_SOURCE_MARKDOWN/);
    });
  }
});

describe("multilingual regression matrix", () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const scenario of MATRIX_SCENARIOS) {
      it(`${locale} / ${scenario}`, () => {
        const proposal = FIVE_MIN_PROPOSALS[locale];
        const turns = turnsAfterProposal(locale);

        if (scenario === "A_hesitation") {
          const c = classifyShortTurn({
            message: AMBIVALENCE_MSG[locale],
            previousAssistantMessage: proposal,
            hasRecentHistory: true,
          });
          expect(c.continuePreviousTopic).toBe(true);
          expect(c.resetConversation).toBe(false);
        }

        if (scenario === "B_rejection") {
          const c = classifyShortTurn({
            message: REJECTION_MSG[locale],
            previousAssistantMessage: proposal,
            hasRecentHistory: true,
          });
          expect(c.continuePreviousTopic).toBe(true);
          expect(c.resetConversation).toBe(false);
        }

        if (scenario === "C_uncertainty") {
          const c = classifyShortTurn({
            message: UNCERTAINTY_MSG[locale],
            previousAssistantMessage: proposal,
            hasRecentHistory: true,
          });
          expect(c.continuePreviousTopic).toBe(true);
        }

        if (scenario === "D_short_agreement") {
          const c = classifyShortTurn({
            message: AGREE_MSG[locale],
            previousAssistantMessage: proposal,
            hasRecentHistory: true,
          });
          expect(c.continuePreviousTopic).toBe(true);
          expect(c.resetConversation).toBe(false);
        }

        if (scenario === "E_callback") {
          const c = classifyShortTurn({
            message: "yeah that",
            previousAssistantMessage: proposal,
            hasRecentHistory: true,
          });
          expect(c.needsContinuation).toBe(true);
        }

        if (scenario === "F_language_switch") {
          // Mid-thread: prior TR proposal, EN elliptical — still continue.
          const c = classifyShortTurn({
            message: "yeah, I don't know",
            previousAssistantMessage: FIVE_MIN_PROPOSALS.tr,
            hasRecentHistory: true,
          });
          expect(c.continuePreviousTopic).toBe(true);
          expect(c.resetConversation).toBe(false);
        }

        if (scenario === "G_short_ack_no_switch") {
          expect(isNonSwitchingExpression(AGREE_MSG[locale])).toBe(true);
          const resolved = resolveActiveLocale({
            message: AGREE_MSG[locale],
            messageLocale: "en",
            savedLocale: locale,
            fallbackLocale: "en",
          });
          expect(resolved).toBe(locale);
        }

        if (scenario === "H_ordinary_laziness") {
          const intent = resolveIntent({
            coach: "kai",
            message: "I don't feel like training today",
          });
          expect(["motivation", "unknown", "casual"]).toContain(intent);
          const caps = selectKaiCapsules("motivation");
          expect(caps.join("\n")).toMatch(/ordinary_laziness|resistance|motivat/i);
        }

        if (scenario === "I_illness") {
          const caps = selectKaiCapsules("I have a fever +health");
          expect(caps.join("\n")).toMatch(/health|STOP motivational|safety/i);
        }

        if (scenario === "J_just_talk") {
          const caps = selectKaiCapsules("casual");
          expect(caps.join("\n")).toMatch(/casual_life|just talk|non-fitness/i);
          void turns;
        }
      });
    }
  }
});

describe("code-switching continuation", () => {
  it("TR → EN elliptical keeps continuation", () => {
    const c = classifyShortTurn({
      message: "yeah, I don't know",
      previousAssistantMessage: FIVE_MIN_PROPOSALS.tr,
      hasRecentHistory: true,
    });
    expect(c.continuePreviousTopic).toBe(true);
  });

  it("EN → TR elliptical keeps continuation", () => {
    const c = classifyShortTurn({
      message: "bilmiyorum ya",
      previousAssistantMessage: FIVE_MIN_PROPOSALS.en,
      hasRecentHistory: true,
    });
    expect(c.continuePreviousTopic).toBe(true);
  });

  it("DE → EN / ES → EN / AR → EN", () => {
    for (const prev of [
      FIVE_MIN_PROPOSALS.de,
      FIVE_MIN_PROPOSALS.es,
      FIVE_MIN_PROPOSALS.ar,
    ]) {
      const c = classifyShortTurn({
        message: "maybe",
        previousAssistantMessage: prev,
        hasRecentHistory: true,
      });
      expect(c.continuePreviousTopic).toBe(true);
    }
  });
});

describe("locale resolution + short ack", () => {
  it("short acks do not overwrite saved locale", () => {
    for (const ack of ["ok", "yes", "thanks", "tamam", "ja", "sí", "تمام"]) {
      expect(isNonSwitchingExpression(ack)).toBe(true);
      expect(
        resolveActiveLocale({
          message: ack,
          messageLocale: "fr",
          savedLocale: "de",
          fallbackLocale: "en",
        }),
      ).toBe("de");
    }
  });

  it("short acks stay on Settings language", () => {
    expect(
      resolveActiveLocale({
        message: "sagol",
        messageLocale: "en",
        conversationLocale: "tr",
        savedLocale: "en",
        fallbackLocale: "en",
      }),
    ).toBe("en");
  });

  it("does not follow message language over Settings", () => {
    expect(
      resolveActiveLocale({
        message: "I don't feel like training today",
        messageLocale: "en",
        savedLocale: "tr",
        fallbackLocale: "en",
      }),
    ).toBe("tr");
  });
});

describe("Arabic RTL semantic parity", () => {
  it("AR ambivalence matches EN structural flags", () => {
    const en = classifyShortTurn({
      message: AMBIVALENCE_MSG.en,
      previousAssistantMessage: FIVE_MIN_PROPOSALS.en,
      hasRecentHistory: true,
    });
    const ar = classifyShortTurn({
      message: AMBIVALENCE_MSG.ar,
      previousAssistantMessage: FIVE_MIN_PROPOSALS.ar,
      hasRecentHistory: true,
    });
    expect(ar.continuePreviousTopic).toBe(en.continuePreviousTopic);
    expect(ar.resetConversation).toBe(en.resetConversation);
    expect(ar.needsContinuation).toBe(en.needsContinuation);
  });

  it("AR localization pack is present", () => {
    expect(getLocalePack("ar")).toMatch(/كبير|وحش|بطل|عامية/i);
  });
});

describe("personality parity across locales", () => {
  const requiredConcepts = [
    /companion|teammate|dragon companion/i,
    /natural|conversation|casual_life/i,
    /adapt|resistance_adaptation|after_user_resists|resist again/i,
    /laziness|ordinary_laziness/i,
    /humor|teasing|playful|joke/i,
    /never.*shame|no.*shame|without shame/i,
    /therapist/i,
    /continuity|elliptical|continuation/i,
    /precise_history|never_fake_memory|invent/i,
    /pause coaching|just talk|stop coaching/i,
  ];

  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale}: critical personality concepts compile`, () => {
      const { blob } = promptInspection(locale, AMBIVALENCE_MSG[locale]);
      for (const re of requiredConcepts) {
        expect(blob, `${locale} missing ${re}`).toMatch(re);
      }
      expect(getLocalePack(locale).length).toBeGreaterThan(20);
    });
  }
});

describe("precise state provenance", () => {
  it("gymSkipFacts labels TRUSTED_ANALYTICS and requires logged workout", () => {
    expect(gymSkipFacts([], 14)).toEqual([]);
    const facts = gymSkipFacts(
      [{ entry_date: "2026-07-01", workouts_completed: 1 }],
      14,
    );
    expect(facts.join(" ")).toMatch(/canonical:.*TRUSTED_ANALYTICS/);
    expect(facts.join(" ")).toMatch(/14/);
  });

  it("Kai capsules forbid inventing precise personal history", () => {
    const blob = selectKaiCapsules("continuation +continuation").join("\n");
    expect(blob).toMatch(/precise_history|never invent|14 days|7 months/i);
  });

  it("USER_CONTEXT with canonical days is included; invented months not in capsules as facts", () => {
    const { blob } = promptInspection("en", "I don't know");
    expect(blob).toMatch(/TRUSTED_ANALYTICS|canonical:/);
    expect(blob).not.toMatch(/you have trained for 7 months/i);
  });
});

describe("buddy nicknames per locale pack", () => {
  it("TR pack stays Turkish without assigning Alex nicknames to every coach", () => {
    const pack = getLocalePack("tr");
    expect(pack).toMatch(/Türkçe|Turkc/i);
    expect(pack).toMatch(/Maya veya Leo/i);
  });

  it("EN pack is native English without shared gym-bro nicknames", () => {
    const pack = getLocalePack("en");
    expect(pack).toMatch(/English/i);
    expect(pack).not.toMatch(/bro \/ king \/ champ/);
  });

  it("compiled TR prompt keeps Kai buddy_address without flattening to Alex", () => {
    const { blob } = promptInspection("tr", "bilmiyorum");
    expect(blob).toMatch(/buddy_address/);
    expect(blob).toMatch(/3 mesaj|every 3|nickname_cadence/i);
    expect(blob).toMatch(/kanka/);
    expect(blob).toMatch(/distinct_coaches|not_alex|sounding like Alex/i);
  });
});

describe("Unicode stream completion", () => {
  it("detects unpaired surrogates", () => {
    expect(hasBrokenUtf16("ok")).toBe(false);
    expect(hasBrokenUtf16("Türkçe")).toBe(false);
    expect(hasBrokenUtf16("Übung")).toBe(false);
    expect(hasBrokenUtf16("café")).toBe(false);
    expect(hasBrokenUtf16("ما أدري")).toBe(false);
    expect(hasBrokenUtf16("\uD800")).toBe(true);
    expect(hasBrokenUtf16("hi\uD800")).toBe(true);
  });

  it("marks aborted / broken / empty-after-delta as suspicious", () => {
    expect(isStreamCompletionSuspicious({ text: "ok", aborted: true })).toBe(
      true,
    );
    expect(
      isStreamCompletionSuspicious({ text: "\uD800", sawDelta: true }),
    ).toBe(true);
    expect(
      isStreamCompletionSuspicious({ text: "   ", sawDelta: true }),
    ).toBe(true);
    expect(
      isStreamCompletionSuspicious({ text: "Beş dakika", sawDelta: true }),
    ).toBe(false);
    expect(
      isStreamCompletionSuspicious({
        text: "Kalori: 600 — ya da daha net bir hesap istersen dürümdeki ana malzemeleri sö",
        sawDelta: true,
        finishReason: "length",
      }),
    ).toBe(true);
    expect(
      isStreamCompletionSuspicious({
        text: "5 gün için net bir split: Pazartesi göğüs-triceps, Salı sırt-biceps, Çarşamba bacak. Ekipman salon varsayıyorum, değişirse söylersin.",
        sawDelta: true,
        finishReason: "length",
      }),
    ).toBe(false);
  });
});

describe("compiled prompt inspection (TR EN DE ES AR)", () => {
  for (const locale of ["tr", "en", "de", "es", "ar"] as const) {
    it(`${locale}: inspection fields present`, () => {
      const { ctx, blob, estimatedInputTokens } = promptInspection(
        locale,
        AMBIVALENCE_MSG[locale],
      );
      expect(ctx.coach).toBe("kai");
      expect(ctx.locale).toBe(locale);
      expect(blob).toContain("kai.mode.continuation");
      expect((ctx.conversationTurns?.length ?? 0) >= 1).toBe(true);
      expect((ctx.conversationTurns?.length ?? 0) <= 3).toBe(true);
      expect(ctx.memoryItems?.length ?? 0).toBeGreaterThan(0);
      expect(ctx.userState ?? "").toMatch(/canonical|TRUSTED/);
      expect(ctx.maxTokens).toBeGreaterThan(0);
      expect(estimatedInputTokens).toBeGreaterThan(0);
      expect(continuationHint(
        classifyShortTurn({
          message: AMBIVALENCE_MSG[locale],
          previousAssistantMessage: FIVE_MIN_PROPOSALS[locale],
          hasRecentHistory: true,
        }),
        FIVE_MIN_PROPOSALS[locale],
      )).toContain("continue_previous_topic");
    });
  }
});

describe("intent: elliptical after proposal is not bare casual", () => {
  it("bilmiyorum after proposal → unknown (continuation path)", () => {
    const intent = resolveIntent({
      coach: "kai",
      message: "bilmiyorum",
      previousAssistantMessage: FIVE_MIN_PROPOSALS.tr,
      hasRecentHistory: true,
    });
    expect(intent).not.toBe("casual");
  });

  it("bilmiyorum after workout proposal gets enough output budget", () => {
    expect(
      outputBudgetFor("unknown", "bilmiyorum", { needsContinuation: true }),
    ).toBeGreaterThanOrEqual(200);
  });

  it("fitness hesitation prompt keeps motivation + coaching thread", () => {
    const { blob } = promptInspection("tr", "bilmiyorum");
    expect(blob).toContain("kai.mode.motivation");
    expect(blob).toMatch(/coaching_thread|do_not_defer_sport|minimum-action/i);
    expect(blob).toMatch(/ban_topic_reset|ne hakkında konuşmak/i);
  });

  it("paraphrase without keyword list still continues via structure", () => {
    const c = classifyShortTurn({
      message: "hmm",
      previousAssistantMessage: FIVE_MIN_PROPOSALS.en,
      hasRecentHistory: true,
    });
    expect(c.needsContinuation).toBe(true);
    expect(c.resetConversation).toBe(false);
  });
});
