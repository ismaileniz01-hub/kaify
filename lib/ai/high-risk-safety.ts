export type HighRiskCategory =
  | "self_harm_imminent"
  | "medical_emergency"
  | "eating_disorder_crisis";

const SELF_HARM_PATTERNS = [
  /\b(?:kill|hurt|harm)\s+myself\b/i,
  /\b(?:end|take)\s+my\s+(?:life|own life)\b/i,
  /\bi\s+(?:want|plan|intend)\s+to\s+die\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bintihar\b/i,
  /\bkendimi\s+(?:öldür|öldürmek|yarala|kes)/i,
  /\byaşamak\s+istemiyorum\b/i,
];

const MEDICAL_EMERGENCY_PATTERNS = [
  /\b(?:heart attack|stroke|seizure|anaphylaxis)\b/i,
  /\b(?:severe|crushing)\s+chest pain\b/i,
  /\b(?:cannot|can't|can not)\s+breathe\b/i,
  /\b(?:passed out|fainted|unconscious)\b/i,
  /\bkalp krizi\b/i,
  /\bfelç\b/i,
  /\bnöbet geçir/i,
  /\bnefes alamıyorum\b/i,
  /\bşiddetli göğüs ağrısı\b/i,
  /\bbilinc(?:im|i)\s+(?:kapalı|gidiyor)\b/i,
];

const EATING_DISORDER_CRISIS_PATTERNS = [
  /\b(?:make myself|force myself)\s+(?:to\s+)?(?:vomit|throw up)\b/i,
  /\b(?:haven't|have not)\s+eaten\s+for\s+\d+\s+days?\b/i,
  /\b(?:stop|avoid)\s+eating\s+completely\b/i,
  /\bkendimi\s+kustur/i,
  /\b\d+\s+gündür\s+(?:hiç\s+)?yemiyorum\b/i,
  /\byemeyi\s+tamamen\s+bırak/i,
];

export function classifyHighRiskMessage(
  input: string,
): HighRiskCategory | null {
  const normalized = input.normalize("NFKC").trim();
  const selfHarmText = normalized.replace(/\bsuicide grip\b/gi, "");
  if (SELF_HARM_PATTERNS.some((pattern) => pattern.test(selfHarmText))) {
    return "self_harm_imminent";
  }
  if (MEDICAL_EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "medical_emergency";
  }
  if (
    EATING_DISORDER_CRISIS_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return "eating_disorder_crisis";
  }
  return null;
}

export function highRiskSafetyResponse(
  category: HighRiskCategory,
  locale: string,
): string {
  const turkish = locale.toLowerCase().startsWith("tr");

  if (turkish) {
    if (category === "medical_emergency") {
      return "Bu acil bir durum olabilir. Egzersizi bırak, yalnız kalma ve şimdi 112'yi ya da bulunduğun yerdeki acil yardım numarasını ara. Buradan tanı koyamam veya acil müdahalenin yerini alamam.";
    }
    if (category === "self_harm_imminent") {
      return "Şu anda güvenliğin her şeyden önemli. Yalnız kalma; kendine zarar verebileceğin araçlardan uzaklaş ve hemen 112'yi ya da bulunduğun yerdeki kriz/acil yardım hattını ara. Güvendiğin bir kişiye şimdi haber ver.";
    }
    return "Bu durum profesyonel destek gerektirebilir. Kendini kusturma veya uzun süre aç kalma davranışını sürdürme; bugün bir doktorla ya da yeme bozuklukları konusunda uzman bir ruh sağlığı profesyoneliyle iletişime geç. Bayılma, göğüs ağrısı veya nefes darlığı varsa 112'yi ara.";
  }

  if (category === "medical_emergency") {
    return "This may be an emergency. Stop exercising, do not stay alone, and call your local emergency number now. I cannot diagnose this or replace emergency care.";
  }
  if (category === "self_harm_imminent") {
    return "Your immediate safety matters most. Do not stay alone, move away from anything you could use to hurt yourself, and call your local emergency or crisis service now. Tell someone you trust right now.";
  }
  return "This may need professional support. Do not continue purging or prolonged restriction; contact a doctor or an eating-disorder mental health professional today. Call emergency services now if you have fainting, chest pain, or trouble breathing.";
}
