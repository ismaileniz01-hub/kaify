import type { LangCode } from "@/lib/lang-context-types";

type NativeLoginCopy = {
  checkEmail: string;
  enterCodeSignup: string;
  enterCodeLogin: string;
  changeEmail: string;
  inboxHint: string;
  codeLabel: string;
  verifying: string;
  createAccount: string;
  signIn: string;
  codeExpires: string;
  subtitle: string;
  haveAccount: string;
  newUserHint: string;
  emailPlaceholder: string;
  acceptTermsPrefix: string;
  terms: string;
  and: string;
  privacy: string;
  aiConsent: string;
  byContinuing: string;
  termsOfService: string;
  sending: string;
  sendVerify: string;
  sendLogin: string;
  or: string;
  password: string;
  signingIn: string;
  signInPassword: string;
  createAnAccount: string;
  preparing: string;
};

const EN: NativeLoginCopy = {
  checkEmail: "Check your email",
  enterCodeSignup: "Enter the code to finish creating your account.",
  enterCodeLogin: "Enter the 6-digit code from your email.",
  changeEmail: "Change email",
  inboxHint: "Check your inbox for a 6-digit code (email is in English).",
  codeLabel: "6-digit code",
  verifying: "Verifying…",
  createAccount: "Create account",
  signIn: "Sign in",
  codeExpires: "The code expires in a few minutes",
  subtitle: "4 coaches. One team. Designed for you.",
  haveAccount: "Already have an account?",
  newUserHint:
    "New to Kaify Ai? Create your account at kaifyai.org, then return here to sign in.",
  emailPlaceholder: "Your email address",
  acceptTermsPrefix: "I accept the",
  terms: "Terms",
  and: "and",
  privacy: "Privacy Policy",
  aiConsent:
    "I explicitly consent to AI processing of fitness and health data. I can withdraw this optional consent later.",
  byContinuing: "By continuing, you agree to our",
  termsOfService: "Terms of Service",
  sending: "Sending…",
  sendVerify: "Send verification code",
  sendLogin: "Send login code",
  or: "or",
  password: "Password",
  signingIn: "Signing in…",
  signInPassword: "Sign in with password",
  createAnAccount: "Create an account",
  preparing: "Preparing sign-in…",
};

const TR: NativeLoginCopy = {
  checkEmail: "E-postanı kontrol et",
  enterCodeSignup: "Hesabı oluşturmak için kodu gir.",
  enterCodeLogin: "E-postandaki 6 haneli kodu gir.",
  changeEmail: "E-postayı değiştir",
  inboxHint: "Gelen kutusunda 6 haneli kodu ara (e-posta İngilizce olabilir).",
  codeLabel: "6 haneli kod",
  verifying: "Doğrulanıyor…",
  createAccount: "Hesap oluştur",
  signIn: "Giriş yap",
  codeExpires: "Kod birkaç dakika içinde geçersiz olur",
  subtitle: "4 koç. Tek takım. Sana göre.",
  haveAccount: "Zaten hesabın var mı?",
  newUserHint:
    "Kaify Ai yeni misin? Hesabını kaifyai.org’da oluştur, sonra buradan giriş yap.",
  emailPlaceholder: "E-posta adresin",
  acceptTermsPrefix: "Kabul ediyorum:",
  terms: "Koşullar",
  and: "ve",
  privacy: "Gizlilik Politikası",
  aiConsent:
    "Antrenman ve sağlık verilerimin yapay zeka ile işlenmesine açıkça onay veriyorum. Bu isteğe bağlı onayı sonra geri alabilirim.",
  byContinuing: "Devam ederek şunları kabul edersin:",
  termsOfService: "Kullanım Koşulları",
  sending: "Gönderiliyor…",
  sendVerify: "Doğrulama kodu gönder",
  sendLogin: "Giriş kodu gönder",
  or: "veya",
  password: "Şifre",
  signingIn: "Giriş yapılıyor…",
  signInPassword: "Şifre ile giriş yap",
  createAnAccount: "Hesap oluştur",
  preparing: "Giriş hazırlanıyor…",
};

export function nativeLoginCopy(lang: LangCode | "tr" | "en"): NativeLoginCopy {
  return lang === "tr" ? TR : EN;
}
