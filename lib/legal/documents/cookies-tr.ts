import {
  COOKIES_VERSION,
  LEGAL_URL,
  PRIVACY_PATH,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const COOKIES_DOCUMENT_TR: LegalDocument = {
  title: "Çerez Politikası",
  subtitle: `Son güncelleme: 21 Ağustos 2026 · Sürüm ${COOKIES_VERSION}`,
  intro: `Bu Çerez Politikası, Kaify'ın (${LEGAL_URL}) çerezleri, pikselleri, etiketleri, yerel depolamayı (local storage), oturum depolamasını (session storage) ve benzer tarayıcı teknolojilerini nasıl kullandığını açıklar. Yerel mobil SDK'lar (örneğin push token'ları) çerez değildir ve Gizlilik Politikasında açıklanır.`,
  sections: [
    {
      id: "overview",
      title: "1. Genel bakış ve rıza",
      blocks: [
        {
          type: "p",
          text: "Kesinlikle gerekli teknolojiler, talep ettiğiniz hizmeti sunmak için çalışır. Zorunlu olmayan analiz veya pazarlama teknolojileri yalnızca çerez bildirimimizde kabul ettiğinizde etkinleşir (Tümünü kabul et / İsteğe bağlıları reddet / Tercihleri yönet, sunulduğu yerde). İsteğe bağlı kategoriler önceden etkinleştirilmez. Tercihleri kaify_cookie_consent kaydını temizleyerek veya Çerez Tercihleri bağlantılarını kullanarak değiştirebilirsiniz. Global Privacy Control, yasal olarak gerekli ve teknik olarak desteklendiği yerlerde onurlandırılır.",
        },
      ],
    },
    {
      id: "essential",
      title: "2. Kesinlikle gerekli",
      blocks: [
        {
          type: "ul",
          items: [
            "Supabase kimlik doğrulama çerezleri — oturum / giriş durumu (birinci taraf; süre kimlik doğrulama SDK'sına göre)",
            "kaify_csrf — hassas işlemler için CSRF koruması (birinci taraf çerez)",
            "kaify_stepup — yükseltmeli MFA penceresi (birinci taraf çerez)",
            "kaify_admin_hub — geçerli olduğunda yönetici merkezi oturumu (birinci taraf çerez)",
            "kaify-lang — dil tercihi (çerez ve/veya localStorage)",
            "kaify_cookie_consent — çerez tercihinizi, sürümü ve zaman damgasını saklar (localStorage)",
            "kaify_legal_pending — geçici kimlik doğrulama öncesi Koşul/Gizlilik kabul eşitlemesi (localStorage)",
            "Paddle Checkout teknolojileri — talep ettiğiniz ödemeyi açmak ve güvenceye almak için gerekli (üçüncü taraf; satıcı kontrollü)",
          ],
        },
      ],
    },
    {
      id: "functional",
      title: "3. İşlevsel (ürün tercihleri)",
      blocks: [
        {
          type: "p",
          text: "Bunlar kullanıcı deneyimini iyileştirir ve genellikle birinci taraf localStorage'dır (reklam değildir). Örnekler: kaify-theme, kaify-unit, ses tercihleri, seri/oyunlaştırma istemci durumu, yönlendirme kodları, OTP devamı (sessionStorage), analitik önbellek paketi (sessionStorage). Verilerinizi satmak için kullanılmazlar.",
        },
      ],
    },
    {
      id: "analytics",
      title: "4. Analitik (isteğe bağlı — uygulanabildiği yerde rıza gerekir)",
      blocks: [
        {
          type: "ul",
          items: [
            "Vercel Analytics / Speed Insights — anonim veya takma adlı kullanım ve performans ölçümleri (yalnızca isteğe bağlı çerez kabulünden sonra yüklenir; yerel uygulama kabuğunda atlanır)",
            "Birinci taraf ürün analitikleri (Kaify veritabanlarında saklanan antrenman/yemek toplulaştırmaları) tarayıcı reklam çerezleri değildir; Gizlilik Politikasına bakın",
          ],
        },
      ],
    },
    {
      id: "marketing",
      title: "5. Pazarlama / üçüncü taraf (isteğe bağlı veya bağlamsal)",
      blocks: [
        {
          type: "ul",
          items: [
            "Sender.net — isteğe bağlı analitik/pazarlama yolu kabul edildiğinde bekleme listesi/pazarlama e-posta araçları (üçüncü taraf çerez/betik ayarlayabilir)",
            "Google reCAPTCHA — bekleme listesi formlarında bot koruması (çerez ayarlayabilir; o formun kötüye kullanım koruması için gereklidir)",
          ],
        },
        {
          type: "p",
          text: "Termly gömmeleri kanonik Gizlilik Politikası barındırıcısı değildir; ortam yapılandırması ile bir Termly betiği etkinleştirilirse yasal sayfalarda çerez ayarlayabilir. Tercihen depo içi Gizlilik Politikasını /privacy adresinde kullanın.",
        },
      ],
    },
    {
      id: "sentry",
      title: "6. Hata izleme",
      blocks: [
        {
          type: "p",
          text: "Sentry hata izleme, güvenilirlik ve güvenlik için başlatılır. Hizmeti çalıştırmak için operasyonel gereklilik olarak değerlendirilir; yapılandırıldığı yerlerde yükler belirgin kişisel verilerden arındırılır. Hukuk müşavirliği belirli bir yetki alanında Sentry'yi zorunlu olmayan olarak sınıflandırırsa yükleme rıza arkasına alınmalıdır — LEGAL_IMPLEMENTATION_CHECKLIST'te izlenir.",
        },
      ],
    },
    {
      id: "manage",
      title: "7. Tercihleri yönetme",
      blocks: [
        {
          type: "p",
          text: `Çerez bildirimi kontrollerini kullanın, site verilerini temizleyin veya sıfırlamak için yerel depolamadan kaify_cookie_consent kaydını silin. Yalnızca tarayıcı ayarları tek geri çekme yöntemi değildir. Ayrıca bkz. ${PRIVACY_PATH}. Sürüm: ${COOKIES_VERSION}.`,
        },
      ],
    },
  ],
};
