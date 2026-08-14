/**
 * Deterministic localized AI/system copy. Never spend an LLM call to translate errors.
 */

import { resolveLocale } from "@/lib/i18n/dictionary";

export type AiCopyKey =
  | "quota_text"
  | "quota_maya_photo"
  | "quota_leo_photo"
  | "quota_generic"
  | "chat_failed"
  | "message_not_saved"
  | "reply_not_saved"
  | "history_failed"
  | "invalid_coach"
  | "injection_blocked"
  | "canary_blocked"
  | "low_quality_image"
  | "bad_analysis_output"
  | "ai_unconfigured"
  | "ai_timeout"
  | "ai_upstream"
  | "ai_bad_output"
  | "team_unlock_essential"
  | "team_unlock_streak"
  | "team_week_exists"
  | "team_start_first"
  | "team_fallback"
  | "schema_failed";

const COPY: Record<string, Record<AiCopyKey, string>> = {
  en: {
    quota_text: "Your monthly message limit is used up. Upgrade your plan to continue.",
    quota_maya_photo: "Your daily photo analysis limit is used up. Try again tomorrow or upgrade.",
    quota_leo_photo: "Your weekly photo analysis limit is used up. Upgrade to continue.",
    quota_generic: "Your usage limit is used up.",
    chat_failed: "Could not generate a chat reply.",
    message_not_saved: "Could not save your message.",
    reply_not_saved: "Could not save the reply.",
    history_failed: "Could not load chat history.",
    invalid_coach: "Invalid coach.",
    injection_blocked: "This message did not pass the safety check. Please stay on fitness and health topics.",
    canary_blocked: "This reply was stopped for safety. Please rephrase your question.",
    low_quality_image: "This photo is not clear enough for analysis. Follow the tips and try again.",
    bad_analysis_output: "The analysis output could not be validated.",
    ai_unconfigured: "The AI service is not configured right now.",
    ai_timeout: "The AI service timed out.",
    ai_upstream: "Could not reach the AI service. Please try again.",
    ai_bad_output: "The AI reply could not be processed. Please try again.",
    team_unlock_essential: "Team chat is available on Pro and Premium plans.",
    team_unlock_streak: "Team chat unlocks after a 7-day streak.",
    team_week_exists: "This week's team meeting already happened.",
    team_start_first: "Start the team meeting first.",
    team_fallback: "Great week — keep going.",
    schema_failed: "The structured reply could not be validated.",
  },
  tr: {
    quota_text: "Aylık mesaj limitin doldu. Devam etmek için planını yükseltebilirsin.",
    quota_maya_photo: "Günlük fotoğraf analiz hakkın doldu. Yarın tekrar deneyebilir ya da planını yükseltebilirsin.",
    quota_leo_photo: "Haftalık fotoğraf analiz hakkın doldu. Planını yükselterek devam edebilirsin.",
    quota_generic: "Kullanım limitin doldu.",
    chat_failed: "Sohbet yanıtı üretilemedi.",
    message_not_saved: "Mesaj kaydedilemedi.",
    reply_not_saved: "Yanıt kaydedilemedi.",
    history_failed: "Sohbet geçmişi alınamadı.",
    invalid_coach: "Geçersiz koç.",
    injection_blocked: "Mesaj güvenlik kontrolünden geçemedi. Lütfen fitness ve sağlık konularında sor.",
    canary_blocked: "Güvenlik nedeniyle bu yanıt durduruldu. Lütfen sorunu farklı bir şekilde sor.",
    low_quality_image: "Fotoğraf analiz için yeterince net değil. Lütfen ipuçlarını uygulayıp tekrar dene.",
    bad_analysis_output: "Analiz çıktısı doğrulanamadı.",
    ai_unconfigured: "AI servisi şu anda yapılandırılmamış.",
    ai_timeout: "AI servisi zaman aşımına uğradı.",
    ai_upstream: "AI servisine ulaşılamadı, lütfen tekrar deneyin.",
    ai_bad_output: "AI yanıtı işlenemedi, lütfen tekrar deneyin.",
    team_unlock_essential: "Takım sohbeti Pro ve Premium planlarda kullanılabilir.",
    team_unlock_streak: "Takım sohbeti 7 günlük seriden sonra açılır.",
    team_week_exists: "Bu hafta takım toplantısı zaten yapıldı.",
    team_start_first: "Önce takım toplantısını başlatmalısın.",
    team_fallback: "Harika bir hafta — devam et.",
    schema_failed: "Yapılandırılmış yanıt doğrulanamadı.",
  },
  de: {
    quota_text: "Dein monatliches Nachrichtenlimit ist aufgebraucht. Upgrade deinen Plan, um fortzufahren.",
    quota_maya_photo: "Dein tägliches Fotoanalyse-Limit ist aufgebraucht. Versuche es morgen oder upgrade.",
    quota_leo_photo: "Dein wöchentliches Fotoanalyse-Limit ist aufgebraucht. Upgrade, um fortzufahren.",
    quota_generic: "Dein Nutzungslimit ist aufgebraucht.",
    chat_failed: "Die Chat-Antwort konnte nicht erzeugt werden.",
    message_not_saved: "Nachricht konnte nicht gespeichert werden.",
    reply_not_saved: "Antwort konnte nicht gespeichert werden.",
    history_failed: "Chatverlauf konnte nicht geladen werden.",
    invalid_coach: "Ungültiger Coach.",
    injection_blocked: "Diese Nachricht hat die Sicherheitsprüfung nicht bestanden. Bitte bleib bei Fitness und Gesundheit.",
    canary_blocked: "Diese Antwort wurde aus Sicherheitsgründen gestoppt. Bitte formuliere deine Frage um.",
    low_quality_image: "Dieses Foto ist für die Analyse nicht scharf genug. Folge den Tipps und versuche es erneut.",
    bad_analysis_output: "Die Analyseausgabe konnte nicht geprüft werden.",
    ai_unconfigured: "Der KI-Dienst ist gerade nicht konfiguriert.",
    ai_timeout: "Zeitüberschreitung beim KI-Dienst.",
    ai_upstream: "Der KI-Dienst ist nicht erreichbar. Bitte erneut versuchen.",
    ai_bad_output: "Die KI-Antwort konnte nicht verarbeitet werden. Bitte erneut versuchen.",
    team_unlock_essential: "Team-Chat ist in den Plänen Pro und Premium verfügbar.",
    team_unlock_streak: "Team-Chat wird nach einer 7-Tage-Serie freigeschaltet.",
    team_week_exists: "Das Team-Meeting dieser Woche hat bereits stattgefunden.",
    team_start_first: "Starte zuerst das Team-Meeting.",
    team_fallback: "Tolle Woche — mach weiter.",
    schema_failed: "Die strukturierte Antwort konnte nicht geprüft werden.",
  },
  es: {
    quota_text: "Se agotó tu límite mensual de mensajes. Mejora tu plan para continuar.",
    quota_maya_photo: "Se agotó tu límite diario de análisis de fotos. Prueba mañana o mejora tu plan.",
    quota_leo_photo: "Se agotó tu límite semanal de análisis de fotos. Mejora tu plan para continuar.",
    quota_generic: "Se agotó tu límite de uso.",
    chat_failed: "No se pudo generar la respuesta del chat.",
    message_not_saved: "No se pudo guardar tu mensaje.",
    reply_not_saved: "No se pudo guardar la respuesta.",
    history_failed: "No se pudo cargar el historial del chat.",
    invalid_coach: "Coach no válido.",
    injection_blocked: "Este mensaje no superó la comprobación de seguridad. Mantente en temas de fitness y salud.",
    canary_blocked: "Esta respuesta se detuvo por seguridad. Reformula tu pregunta.",
    low_quality_image: "Esta foto no es lo bastante nítida para el análisis. Sigue los consejos e inténtalo de nuevo.",
    bad_analysis_output: "No se pudo validar el resultado del análisis.",
    ai_unconfigured: "El servicio de IA no está configurado ahora.",
    ai_timeout: "El servicio de IA agotó el tiempo de espera.",
    ai_upstream: "No se pudo contactar el servicio de IA. Inténtalo de nuevo.",
    ai_bad_output: "No se pudo procesar la respuesta de IA. Inténtalo de nuevo.",
    team_unlock_essential: "El chat de equipo está disponible en los planes Pro y Premium.",
    team_unlock_streak: "El chat de equipo se desbloquea tras una racha de 7 días.",
    team_week_exists: "La reunión de equipo de esta semana ya se hizo.",
    team_start_first: "Primero inicia la reunión de equipo.",
    team_fallback: "Gran semana — sigue así.",
    schema_failed: "No se pudo validar la respuesta estructurada.",
  },
  ar: {
    quota_text: "نفد حد رسائلك الشهري. رقِّ خطتك للمتابعة.",
    quota_maya_photo: "نفد حد تحليل الصور اليومي. حاول غدًا أو رقِّ خطتك.",
    quota_leo_photo: "نفد حد تحليل الصور الأسبوعي. رقِّ خطتك للمتابعة.",
    quota_generic: "نفد حد الاستخدام.",
    chat_failed: "تعذر إنشاء رد المحادثة.",
    message_not_saved: "تعذر حفظ رسالتك.",
    reply_not_saved: "تعذر حفظ الرد.",
    history_failed: "تعذر تحميل سجل المحادثة.",
    invalid_coach: "مدرب غير صالح.",
    injection_blocked: "لم تجتز هذه الرسالة فحص الأمان. ابقَ ضمن اللياقة والصحة.",
    canary_blocked: "أُوقف هذا الرد لأسباب أمنية. أعد صياغة سؤالك.",
    low_quality_image: "هذه الصورة غير واضحة بما يكفي للتحليل. اتبع النصائح وحاول مرة أخرى.",
    bad_analysis_output: "تعذر التحقق من مخرجات التحليل.",
    ai_unconfigured: "خدمة الذكاء الاصطناعي غير مُهيأة حاليًا.",
    ai_timeout: "انتهت مهلة خدمة الذكاء الاصطناعي.",
    ai_upstream: "تعذر الوصول إلى خدمة الذكاء الاصطناعي. حاول مرة أخرى.",
    ai_bad_output: "تعذر معالجة رد الذكاء الاصطناعي. حاول مرة أخرى.",
    team_unlock_essential: "دردشة الفريق متاحة في خطط Pro وPremium.",
    team_unlock_streak: "تُفتح دردشة الفريق بعد سلسلة 7 أيام.",
    team_week_exists: "اجتماع الفريق لهذا الأسبوع تم بالفعل.",
    team_start_first: "ابدأ اجتماع الفريق أولًا.",
    team_fallback: "أسبوع رائع — تابع.",
    schema_failed: "تعذر التحقق من الرد المنظم.",
  },
};

export function aiCopy(locale: string | null | undefined, key: AiCopyKey): string {
  const loc = resolveLocale(locale);
  const base = loc.split("-")[0] ?? loc;
  const pack = COPY[loc] ?? COPY[base] ?? COPY.en;
  return pack![key] ?? COPY.en![key]!;
}
