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
  | "schema_failed"
  | "coach_retry";

const COPY: Record<string, Record<AiCopyKey, string>> = {
  en: {
    quota_text: "Your monthly message limit is used up. Upgrade your plan to continue.",
    quota_maya_photo: "Your daily photo analysis limit is used up. Try again tomorrow or upgrade.",
    quota_leo_photo: "Your weekly photo analysis limit is used up. Upgrade to continue.",
    quota_generic: "Your usage limit is used up.",
    chat_failed: "Sorry — that was a technical error on our side. We'll fix it as soon as we can. Please try again in a moment.",
    message_not_saved: "Sorry — your message didn't save because of a technical error. We'll fix it as soon as we can. Please try again.",
    reply_not_saved: "Sorry — the reply didn't save because of a technical error. We'll fix it as soon as we can. Please try again.",
    history_failed: "Sorry — chat history didn't load because of a technical error. We'll fix it as soon as we can.",
    invalid_coach: "Invalid coach.",
    injection_blocked: "This message did not pass the safety check. Please stay on fitness and health topics.",
    canary_blocked: "This reply was stopped for safety. Please rephrase your question.",
    low_quality_image: "This photo isn't clear enough. Please upload a sharper photo in better light, with the meal or your body fully in frame.",
    bad_analysis_output: "Sorry — we couldn't read that analysis because of a technical error. We'll fix it as soon as we can. Please try the photo again in a moment.",
    ai_unconfigured: "Sorry — coaching is briefly unavailable because of a technical error. We'll fix it as soon as we can.",
    ai_timeout: "Sorry — that took too long because of a technical error. We'll fix it as soon as we can. Please try again in a moment.",
    ai_upstream: "Sorry — we couldn't reach the coach because of a technical error. We'll fix it as soon as we can. Please try again in a moment.",
    ai_bad_output: "Sorry — the coach's reply failed because of a technical error. We'll fix it as soon as we can. Please try again in a moment.",
    team_unlock_essential: "Team chat is available on Pro and Premium plans.",
    team_unlock_streak: "Team chat unlocks after a 7-day streak.",
    team_week_exists: "This week's team meeting already happened.",
    team_start_first: "Start the team meeting first.",
    team_fallback: "Great week — keep going.",
    schema_failed: "The structured reply could not be validated.",
    coach_retry: "Sorry — that was a technical error on our side. We'll fix it as soon as we can. Please try again in a moment.",
  },
  tr: {
    quota_text: "Aylık mesaj limitin doldu. Devam etmek için planını yükseltebilirsin.",
    quota_maya_photo: "Günlük fotoğraf analiz hakkın doldu. Yarın tekrar deneyebilir ya da planını yükseltebilirsin.",
    quota_leo_photo: "Haftalık fotoğraf analiz hakkın doldu. Planını yükselterek devam edebilirsin.",
    quota_generic: "Kullanım limitin doldu.",
    chat_failed: "Özür dilerim, bu bizim tarafta teknik bir hataydı. En kısa sürede düzelteceğiz. Birazdan tekrar dener misin?",
    message_not_saved: "Özür dilerim, mesajın teknik bir hata yüzünden kaydedilemedi. En kısa sürede düzelteceğiz. Lütfen tekrar dene.",
    reply_not_saved: "Özür dilerim, yanıt teknik bir hata yüzünden kaydedilemedi. En kısa sürede düzelteceğiz. Lütfen tekrar dene.",
    history_failed: "Özür dilerim, sohbet geçmişi teknik bir hata yüzünden açılmadı. En kısa sürede düzelteceğiz.",
    invalid_coach: "Geçersiz koç.",
    injection_blocked: "Mesaj güvenlik kontrolünden geçemedi. Lütfen fitness ve sağlık konularında sor.",
    canary_blocked: "Güvenlik nedeniyle bu yanıt durduruldu. Lütfen sorunu farklı bir şekilde sor.",
    low_quality_image: "Fotoğraf yeterince net değil. Lütfen daha aydınlık bir yerde, öğün ya da vücudun kadrajda tam görünecek şekilde daha net bir fotoğraf yükle.",
    bad_analysis_output: "Özür dilerim, analizi teknik bir hata yüzünden okuyamadık. En kısa sürede düzelteceğiz. Birazdan fotoğrafı tekrar dener misin?",
    ai_unconfigured: "Özür dilerim, koçluk teknik bir hata yüzünden kısa süre kullanılamıyor. En kısa sürede düzelteceğiz.",
    ai_timeout: "Özür dilerim, bu işlem teknik bir hata yüzünden çok uzun sürdü. En kısa sürede düzelteceğiz. Birazdan tekrar dener misin?",
    ai_upstream: "Özür dilerim, koça teknik bir hata yüzünden ulaşamadık. En kısa sürede düzelteceğiz. Birazdan tekrar dener misin?",
    ai_bad_output: "Özür dilerim, koçun yanıtı teknik bir hata yüzünden oluşmadı. En kısa sürede düzelteceğiz. Birazdan tekrar dener misin?",
    team_unlock_essential: "Takım sohbeti Pro ve Premium planlarda kullanılabilir.",
    team_unlock_streak: "Takım sohbeti 7 günlük seriden sonra açılır.",
    team_week_exists: "Bu hafta takım toplantısı zaten yapıldı.",
    team_start_first: "Önce takım toplantısını başlatmalısın.",
    team_fallback: "Harika bir hafta — devam et.",
    schema_failed: "Yapılandırılmış yanıt doğrulanamadı.",
    coach_retry: "Özür dilerim, bu bizim tarafta teknik bir hataydı. En kısa sürede düzelteceğiz. Birazdan tekrar dener misin?",
  },
  de: {
    quota_text: "Dein monatliches Nachrichtenlimit ist aufgebraucht. Upgrade deinen Plan, um fortzufahren.",
    quota_maya_photo: "Dein tägliches Fotoanalyse-Limit ist aufgebraucht. Versuche es morgen oder upgrade.",
    quota_leo_photo: "Dein wöchentliches Fotoanalyse-Limit ist aufgebraucht. Upgrade, um fortzufahren.",
    quota_generic: "Dein Nutzungslimit ist aufgebraucht.",
    chat_failed: "Entschuldigung — das war ein technischer Fehler bei uns. Wir beheben das so schnell wie möglich. Bitte versuche es gleich noch einmal.",
    message_not_saved: "Entschuldigung — deine Nachricht wurde wegen eines technischen Fehlers nicht gespeichert. Wir beheben das so schnell wie möglich. Bitte versuche es noch einmal.",
    reply_not_saved: "Entschuldigung — die Antwort wurde wegen eines technischen Fehlers nicht gespeichert. Wir beheben das so schnell wie möglich. Bitte versuche es noch einmal.",
    history_failed: "Entschuldigung — der Chatverlauf ließ sich wegen eines technischen Fehlers nicht laden. Wir beheben das so schnell wie möglich.",
    invalid_coach: "Ungültiger Coach.",
    injection_blocked: "Diese Nachricht hat die Sicherheitsprüfung nicht bestanden. Bitte bleib bei Fitness und Gesundheit.",
    canary_blocked: "Diese Antwort wurde aus Sicherheitsgründen gestoppt. Bitte formuliere deine Frage um.",
    low_quality_image: "Dieses Foto ist nicht scharf genug. Bitte lade ein schärferes Foto bei besserem Licht hoch, mit der Mahlzeit oder dem Körper vollständig im Bild.",
    bad_analysis_output: "Entschuldigung — die Analyse ist an einem technischen Fehler gescheitert. Wir beheben das so schnell wie möglich. Bitte versuche das Foto gleich noch einmal.",
    ai_unconfigured: "Entschuldigung — Coaching ist wegen eines technischen Fehlers kurz nicht verfügbar. Wir beheben das so schnell wie möglich.",
    ai_timeout: "Entschuldigung — das hat wegen eines technischen Fehlers zu lange gedauert. Wir beheben das so schnell wie möglich. Bitte versuche es gleich noch einmal.",
    ai_upstream: "Entschuldigung — der Coach war wegen eines technischen Fehlers nicht erreichbar. Wir beheben das so schnell wie möglich. Bitte versuche es gleich noch einmal.",
    ai_bad_output: "Entschuldigung — die Antwort ist an einem technischen Fehler gescheitert. Wir beheben das so schnell wie möglich. Bitte versuche es gleich noch einmal.",
    team_unlock_essential: "Team-Chat ist in den Plänen Pro und Premium verfügbar.",
    team_unlock_streak: "Team-Chat wird nach einer 7-Tage-Serie freigeschaltet.",
    team_week_exists: "Das Team-Meeting dieser Woche hat bereits stattgefunden.",
    team_start_first: "Starte zuerst das Team-Meeting.",
    team_fallback: "Tolle Woche — mach weiter.",
    schema_failed: "Die strukturierte Antwort konnte nicht geprüft werden.",
    coach_retry: "Entschuldigung — das war ein technischer Fehler bei uns. Wir beheben das so schnell wie möglich. Bitte versuche es gleich noch einmal.",
  },
  es: {
    quota_text: "Se agotó tu límite mensual de mensajes. Mejora tu plan para continuar.",
    quota_maya_photo: "Se agotó tu límite diario de análisis de fotos. Prueba mañana o mejora tu plan.",
    quota_leo_photo: "Se agotó tu límite semanal de análisis de fotos. Mejora tu plan para continuar.",
    quota_generic: "Se agotó tu límite de uso.",
    chat_failed: "Perdón — esto fue un error técnico de nuestra parte. Lo corregiremos lo antes posible. Inténtalo de nuevo en un momento.",
    message_not_saved: "Perdón — tu mensaje no se guardó por un error técnico. Lo corregiremos lo antes posible. Inténtalo de nuevo.",
    reply_not_saved: "Perdón — la respuesta no se guardó por un error técnico. Lo corregiremos lo antes posible. Inténtalo de nuevo.",
    history_failed: "Perdón — el historial no se cargó por un error técnico. Lo corregiremos lo antes posible.",
    invalid_coach: "Coach no válido.",
    injection_blocked: "Este mensaje no superó la comprobación de seguridad. Mantente en temas de fitness y salud.",
    canary_blocked: "Esta respuesta se detuvo por seguridad. Reformula tu pregunta.",
    low_quality_image: "Esta foto no es lo bastante nítida. Sube una foto más nítida, con mejor luz, y con la comida o tu cuerpo completos en el encuadre.",
    bad_analysis_output: "Perdón — no pudimos leer el análisis por un error técnico. Lo corregiremos lo antes posible. Prueba la foto de nuevo en un momento.",
    ai_unconfigured: "Perdón — el coaching no está disponible un momento por un error técnico. Lo corregiremos lo antes posible.",
    ai_timeout: "Perdón — tardó demasiado por un error técnico. Lo corregiremos lo antes posible. Inténtalo de nuevo en un momento.",
    ai_upstream: "Perdón — no llegamos al coach por un error técnico. Lo corregiremos lo antes posible. Inténtalo de nuevo en un momento.",
    ai_bad_output: "Perdón — la respuesta falló por un error técnico. Lo corregiremos lo antes posible. Inténtalo de nuevo en un momento.",
    team_unlock_essential: "El chat de equipo está disponible en los planes Pro y Premium.",
    team_unlock_streak: "El chat de equipo se desbloquea tras una racha de 7 días.",
    team_week_exists: "La reunión de equipo de esta semana ya se hizo.",
    team_start_first: "Primero inicia la reunión de equipo.",
    team_fallback: "Gran semana — sigue así.",
    schema_failed: "No se pudo validar la respuesta estructurada.",
    coach_retry: "Perdón — esto fue un error técnico de nuestra parte. Lo corregiremos lo antes posible. Inténtalo de nuevo en un momento.",
  },
  ar: {
    quota_text: "نفد حد رسائلك الشهري. رقِّ خطتك للمتابعة.",
    quota_maya_photo: "نفد حد تحليل الصور اليومي. حاول غدًا أو رقِّ خطتك.",
    quota_leo_photo: "نفد حد تحليل الصور الأسبوعي. رقِّ خطتك للمتابعة.",
    quota_generic: "نفد حد الاستخدام.",
    chat_failed: "نعتذر — هذا خطأ تقني من طرفنا. سنصلحه في أقرب وقت. حاول مرة أخرى بعد قليل.",
    message_not_saved: "نعتذر — لم تُحفظ رسالتك بسبب خطأ تقني. سنصلحه في أقرب وقت. حاول مرة أخرى.",
    reply_not_saved: "نعتذر — لم يُحفظ الرد بسبب خطأ تقني. سنصلحه في أقرب وقت. حاول مرة أخرى.",
    history_failed: "نعتذر — لم يُفتح السجل بسبب خطأ تقني. سنصلحه في أقرب وقت.",
    invalid_coach: "مدرب غير صالح.",
    injection_blocked: "لم تجتز هذه الرسالة فحص الأمان. ابقَ ضمن اللياقة والصحة.",
    canary_blocked: "أُوقف هذا الرد لأسباب أمنية. أعد صياغة سؤالك.",
    low_quality_image: "هذه الصورة ليست واضحة بما يكفي. ارفع صورة أوضح بإضاءة أفضل، بحيث تظهر الوجبة أو جسمك بالكامل.",
    bad_analysis_output: "نعتذر — تعذرت قراءة التحليل بسبب خطأ تقني. سنصلحه في أقرب وقت. أعد إرسال الصورة بعد قليل.",
    ai_unconfigured: "نعتذر — التدريب غير متاح لحظة بسبب خطأ تقني. سنصلحه في أقرب وقت.",
    ai_timeout: "نعتذر — استغرق الأمر وقتًا طويلًا بسبب خطأ تقني. سنصلحه في أقرب وقت. حاول مرة أخرى بعد قليل.",
    ai_upstream: "نعتذر — تعذر الوصول إلى المدرب بسبب خطأ تقني. سنصلحه في أقرب وقت. حاول مرة أخرى بعد قليل.",
    ai_bad_output: "نعتذر — فشل الرد بسبب خطأ تقني. سنصلحه في أقرب وقت. حاول مرة أخرى بعد قليل.",
    team_unlock_essential: "دردشة الفريق متاحة في خطط Pro وPremium.",
    team_unlock_streak: "تُفتح دردشة الفريق بعد سلسلة 7 أيام.",
    team_week_exists: "اجتماع الفريق لهذا الأسبوع تم بالفعل.",
    team_start_first: "ابدأ اجتماع الفريق أولًا.",
    team_fallback: "أسبوع رائع — تابع.",
    schema_failed: "تعذر التحقق من الرد المنظم.",
    coach_retry: "نعتذر — هذا خطأ تقني من طرفنا. سنصلحه في أقرب وقت. حاول مرة أخرى بعد قليل.",
  },
};

export function aiCopy(locale: string | null | undefined, key: AiCopyKey): string {
  const loc = resolveLocale(locale);
  const base = loc.split("-")[0] ?? loc;
  const pack = COPY[loc] ?? COPY[base] ?? COPY.en;
  return pack![key] ?? COPY.en![key]!;
}
