import { COOKIES_VERSION, LEGAL_URL } from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const COOKIES_DOCUMENT_TR: LegalDocument = {
  title: "Çerez Politikası",
  subtitle: `Son güncelleme: 5 Temmuz 2026 · Sürüm ${COOKIES_VERSION}`,
  sections: [
    {
      id: "overview",
      title: "1. Genel Bakış",
      blocks: [{ type: "p", text: `Bu Çerez Politikası, Kaify Ai'ın (${LEGAL_URL}) çerezleri ve benzer teknolojileri nasıl kullandığını açıklar. Çerez bildiriminde Kabul Et'e bastığınızda isteğe bağlı analiz çerezleri etkinleştirilebilir. İsteğe bağlıları reddetmek yalnızca zorunlu çerezleri korur.` }],
    },
    {
      id: "essential",
      title: "2. Zorunlu Çerezler",
      blocks: [
        { type: "p", text: "Bunlar uygulamanın çalışması için gereklidir ve devre dışı bırakılamaz:" },
        { type: "ul", items: [
          "Supabase kimlik doğrulama çerezleri — güvenli biçimde oturumunuzun açık kalmasını sağlar",
          "kaify_csrf — hesap silme, veri dışa aktarma ve satın alma işlemlerini siteler arası saldırılardan korur",
        ] },
      ],
    },
    {
      id: "optional",
      title: "3. İsteğe Bağlı Çerezler",
      blocks: [
        { type: "p", text: "Yalnızca isteğe bağlı çerezleri kabul ederseniz yüklenir:" },
        { type: "ul", items: [
          "Vercel Analytics / Speed Insights — anonim kullanım ölçümleri",
          "Sender.net — pazarlama ve bekleme listesi e-postası (yalnızca tanıtım sayfası)",
        ] },
      ],
    },
    {
      id: "third-party",
      title: "4. Üçüncü Taraf Çerezleri",
      blocks: [{ type: "p", text: "Google reCAPTCHA, bekleme listesi formunda çerez ayarlayabilir. Termly, gömülü olduğu durumlarda yasal politika sayfalarında çerez ayarlayabilir. Alt işleyenler için Gizlilik Politikamıza bakın." }],
    },
    {
      id: "manage",
      title: "5. Tercihleri Yönetme",
      blocks: [{ type: "p", text: `Çerez bildirimini yeniden görmek için tarayıcınızdaki site verilerini temizleyin veya yerel depolamadan kaify_cookie_consent kaydını silin. Uygulamayı kullandığınızda zorunlu çerezler yeniden yüklenir. Sürüm: ${COOKIES_VERSION}.` }],
    },
  ],
};
