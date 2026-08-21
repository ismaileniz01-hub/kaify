import { localeDisplayName } from "@/lib/i18n/dictionary";
import type { SupportedLocale } from "@/lib/i18n/dictionary";

/** Hard per-turn instruction — placed on the trusted side of the current user turn. */
export function buildReplyLanguageDirective(replyLocale: SupportedLocale): string {
  const language = localeDisplayName(replyLocale);
  return [
    "REPLY LANGUAGE (mandatory — this is the user's Settings language):",
    `Write your ENTIRE reply only in ${language} (${replyLocale}). Do not mix languages.`,
    "Do not switch language because the user mixed English food/exercise names, pasted macros, omitted accents, or wrote a short ack.",
    "Only Settings changes the reply language — not the current message language.",
    "USER_CONTEXT, memories, and tool JSON are internal English data. Do not switch to English because of them.",
    "Users often omit accents/special letters (e.g. turkce, nasil, sagol). Understand them normally; reply with correct spelling.",
    "Never mention context data, USER_CONTEXT, or that you are reading a profile dump. Speak as a coach.",
  ].join("\n");
}
