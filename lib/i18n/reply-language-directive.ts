import { localeDisplayName } from "@/lib/i18n/dictionary";
import type { SupportedLocale } from "@/lib/i18n/dictionary";

/** Hard per-turn instruction — placed on the trusted side of the current user turn. */
export function buildReplyLanguageDirective(replyLocale: SupportedLocale): string {
  const language = localeDisplayName(replyLocale);
  return [
    "REPLY LANGUAGE (mandatory — overrides app locale and every other language hint):",
    `The user's current message is in ${language} (${replyLocale}).`,
    `Write your ENTIRE reply only in ${language}. Do not mix languages.`,
    "Do not default to the app UI language when it differs from the message language.",
    "USER_CONTEXT, memories, and tool JSON are internal English data. Do not switch to English because of them.",
    "Users often omit accents/special letters (e.g. turkce, nasil, sagol). Understand them normally; reply with correct spelling.",
    "Never mention context data, USER_CONTEXT, or that you are reading a profile dump. Speak as a coach.",
  ].join("\n");
}
