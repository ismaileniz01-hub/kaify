import {
  LEGAL_ENTITY,
  LEGAL_URL,
  PADDLE_BUYER_TERMS_URL,
  PADDLE_REFUND_POLICY_URL,
  SUPPORT_EMAIL,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const REFUND_DOCUMENT_TR: LegalDocument = {
  title: "İade Politikası",
  subtitle: "Son güncelleme: 28 Kasım 2026 · Çelişki halinde İngilizce metin esastır",
  intro: `Bu İade Politikası, Kaify Ai (${LEGAL_URL}) için yapılan ödemelerin hangi durumlarda iade edilebileceğini açıklar. Kısaca: tüm ödemeler kesindir; yalnızca emredici tüketici mevzuatının sözleşmeyle kaldırılamayan haklar tanıdığı durumlar saklıdır. Bu politika o hakları sınırlamaz.`,
  sections: [
    {
      id: "merchant",
      title: "1. Ödemeleri ve iadeleri kim yürütür",
      blocks: [
        {
          type: "p",
          text: `Tüm Kaify Ai satın alımlarında Paddle, kayıtlı satıcı (Merchant of Record) ve yeniden satıcı olarak hareket eder. Ödemeler, iadeler ve ters ibrazlar (chargeback) Paddle tarafından Paddle Alıcı Koşulları (${PADDLE_BUYER_TERMS_URL}) ve Paddle İade Politikası (${PADDLE_REFUND_POLICY_URL}) uyarınca işlenir. Bu politika ile Paddle İade Politikasının ya da yürürlükteki mevzuatın emredici bir hükmü çelişirse emredici hüküm uygulanır. Hizmeti ${LEGAL_ENTITY} sağlar ve hangi gönüllü iadeleri destekleyeceğine karar verir; burada sayılanlar dışında gönüllü iade yapılmaz.`,
        },
      ],
    },
    {
      id: "final",
      title: "2. Tüm ödemeler kesindir",
      blocks: [
        {
          type: "p",
          text: "3. ve 4. maddelerde belirtilenler dışında ödemeler iade edilmez ve değiştirilmez. Özellikle aşağıdakiler için iade yapılmaz:",
        },
        {
          type: "ul",
          items: [
            "aboneliğin yenileme ödemeleri, iptal etmeyi unuttuğunuz yenilemeler dahil;",
            "kullanılmayan süre, kısmi faturalama dönemleri veya iptalden sonra dönemin kalanı;",
            "daha ucuz bir plana geçiş veya yıllıktan aylığa geçiş;",
            "bilgilendirme amaçlı olan ve doğruluğu garanti edilmeyen yapay zekâ koçluğu, öğün veya vücut analizlerinden memnun kalmama;",
            "hizmeti kullanmama, zaman bulamama, fikir değiştirme veya sonuçların beklentiyi karşılamaması;",
            "indirimli, kampanyalı veya hediye satın alımlar (yasanın zorunlu kıldığı haller dışında);",
            "Kullanım Koşullarının ihlali nedeniyle hesabın askıya alınması veya kapatılması;",
            "cihazınızdan, ağınızdan, işletim sisteminizden, üçüncü taraf uygulamalardan veya uygulama mağazalarından kaynaklanan sorunlar.",
          ],
        },
      ],
    },
    {
      id: "withdrawal",
      title: "3. Yasal cayma hakkı",
      blocks: [
        {
          type: "p",
          text: "Kaify Ai, hemen başlayan dijital bir hizmettir. Ödemeden önce, hizmetin hemen başlamasını talep ettiğinizi ve hizmet başladıktan sonra, yasanın izin verdiği durumlarda cayma hakkınızı kaybedeceğinizi onaylamanız istenir. Bu onay verilmeden plan satın alınamaz.",
        },
        {
          type: "ul",
          items: [
            "Türkiye: Mesafeli Sözleşmeler Yönetmeliği'nin 15/1-ğ maddesi uyarınca elektronik ortamda anında ifa edilen hizmetlerde cayma hakkı kullanılamaz. Bu nedenle Türkiye'den yapılan satın alımlar, erişim verildiği anda kesinleşir.",
            "Avrupa Birliği, AEA ve Birleşik Krallık: tüketiciyseniz ilk ödemeden itibaren 14 gün içinde cayabilirsiniz (yenilemeler hariç; Birleşik Krallık mevzuatının yıllık yenilemede yeni bir süre tanıdığı haller saklıdır). Hizmetin bu süre içinde başlamasını talep ettiğiniz için iade, cayma anına kadar sağlanan hizmetle orantılı tutar düşülerek yapılır. Mevzuatın hizmeti dijital içerik saydığı ve yukarıdaki onayı verdiğiniz durumlarda cayma hakkı hizmet başladığında sona erer.",
            "Diğer ülkeler: yalnızca yerel emredici tüketici mevzuatının tanıdığı cayma hakları uygulanır.",
            "Cayma süresi işlem tarihinden 14 gün sonra sona erer. Bu tarihten sonraki talepler, 4. madde dışında kabul edilmez.",
          ],
        },
      ],
    },
    {
      id: "faulty",
      title: "4. Ayıplı hizmet",
      blocks: [
        {
          type: "p",
          text: `Ücretli hizmet tanıtıldığı gibi çalışmıyorsa, sorunu fark ettiğiniz tarihten itibaren 30 gün içinde hesap e-postanız, Paddle sipariş numaranız ve bir açıklama ya da ekran görüntüsüyle ${SUPPORT_EMAIL} adresine bildirin. Önce sorunu makul bir süre içinde gidermeye veya erişimi yeniden sağlamaya çalışırız. Hizmeti sözleşmeye uygun hale getiremezsek ya da mevzuat size doğrudan bu hakkı tanıyorsa, hizmetin çalışmadığı süreyle orantılı iade yapılır. Geçici kesintiler, planlı bakım ve Kullanım Koşulları kapsamındaki özellik değişiklikleri ayıp sayılmaz.`,
        },
      ],
    },
    {
      id: "request",
      title: "5. İade talebi nasıl yapılır",
      blocks: [
        {
          type: "ul",
          items: [
            "paddle.net üzerinden (siparişinizi ödemede kullandığınız e-postayla bulabilirsiniz) ya da yukarıdaki e-posta adresine yazarak başvurun.",
            "Hesap e-postasını, Paddle sipariş numarasını, satın alma tarihini ve talebin hukuki dayanağını (cayma veya ayıplı hizmet) belirtin.",
            "Sipariş numarası içermeyen veya satın alımdakinden farklı bir e-postadan gelen talepler, sahiplik doğrulanana kadar reddedilebilir.",
            "Onaylanan iadeler Paddle tarafından ödemenin yapıldığı yönteme gönderilir. Süre, Paddle'a ve bankanıza bağlıdır.",
          ],
        },
      ],
    },
    {
      id: "effects",
      title: "6. İade veya ters ibrazdan sonra",
      blocks: [
        {
          type: "p",
          text: "Bir ödeme iade edildiğinde veya ters ibraz edildiğinde, ilgili ücretli erişim hemen sona erer, abonelik iptal edilir ve o ödemeyle elde edilen uygulama içi ödüller veya avantajlar geri alınabilir. Yukarıdaki süreç yerine ters ibraz başlatılması, uyuşmazlık sürdüğü müddetçe hesabın askıya alınmasına yol açabilir.",
        },
      ],
    },
    {
      id: "abuse",
      title: "7. İade suistimali",
      blocks: [
        {
          type: "p",
          text: "Mevzuatın izin verdiği ölçüde; dolandırıcılık, çalıntı ödeme aracı kullanımı, tekrarlayan satın al-iade et davranışı, tekrar tekrar deneme ya da iade almak için birden fazla hesap kullanılması veya Kullanım Koşullarının ihlali durumunda iade reddedilebilir ve hesap kapatılabilir.",
        },
      ],
    },
    {
      id: "cancel",
      title: "8. İptal, iade değildir",
      blocks: [
        {
          type: "p",
          text: "Aboneliğinizi istediğiniz zaman Ayarlar → Faturalamayı yönet bölümünden veya Paddle müşteri portalından iptal edebilirsiniz. İptal, sonraki yenilemeleri durdurur; erişim, ödenmiş dönemin sonuna kadar devam eder ve bu dönem için iade yapılmaz. Hesabınızı silmek aboneliği hemen iptal eder ve iade hakkı doğurmaz.",
        },
      ],
    },
    {
      id: "changes",
      title: "9. Değişiklikler ve yasal haklarınız",
      blocks: [
        {
          type: "p",
          text: "Bu politikayı güncelleyebiliriz; bir satın alıma, satın alma anında yürürlükte olan sürüm uygulanır. Bu politikadaki hiçbir hüküm, sözleşmeyle kaldırılamayan emredici tüketici mevzuatından doğan haklarınızı ortadan kaldırmaz veya sınırlamaz.",
        },
      ],
    },
  ],
};
